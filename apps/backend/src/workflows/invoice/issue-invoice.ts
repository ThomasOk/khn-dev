import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { INVOICE_MODULE } from "../../modules/invoice"
import InvoiceModuleService from "../../modules/invoice/service"
import { buildInvoiceDocDefinition } from "../../lib/pdf/invoice"
import { renderPdfDocDefinitionToBase64 } from "../../lib/pdf/render"
import { deriveInvoiceFrozenData, InvoiceFrozenData } from "../../lib/invoice/frozen-data"
import { invoiceIssuanceYear } from "../../lib/invoice/issuance-year"
import { lineItemQuantity } from "../../lib/order/line-item-quantity"

// The bout-en-bout emission (spec §"Le workflow est un saga", ADR 0002):
// issueInvoiceStep is the ONLY step that touches the gapless counter, and it
// is never compensated — compensating it would reopen the very gap the
// counter exists to prevent. Every step after it is retriable but, for the
// same reason, also never compensated: a replay of payment.captured must be
// able to pick up wherever a previous attempt stopped (missing file, missing
// link, missing email) without ever undoing the number or the frozen data
// already committed.

export type IssueInvoiceWorkflowInput = {
  order_id: string
}

const loadIssuerConfigStep = createStep(
  "load-issuer-config",
  async (_input: IssueInvoiceWorkflowInput, { container }) => {
    const invoiceService: InvoiceModuleService = container.resolve(INVOICE_MODULE)
    const [issuerConfig] = await invoiceService.listIssuerConfigs({})
    if (!issuerConfig) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No IssuerConfig configured: cannot issue a Facture without the restaurant's legal identity."
      )
    }
    return new StepResponse(issuerConfig)
  }
)

type IssueInvoiceStepInput = {
  order_id: string
  year: number
  frozen_data: InvoiceFrozenData
}

// The single atomic call (ticket 01): allocation of the gapless number and
// insertion of the Invoice happen together, inside invoiceService.issueInvoice.
// No compensation function — this step is terminal (spec §"Le workflow est
// un saga, pas une transaction ACID").
const issueInvoiceStep = createStep(
  "issue-invoice",
  async (input: IssueInvoiceStepInput, { container }) => {
    const invoiceService: InvoiceModuleService = container.resolve(INVOICE_MODULE)
    const invoice = await invoiceService.issueInvoice(input)
    return new StepResponse(invoice)
  }
)

type RenderAndStoreInvoicePdfInput = {
  invoice_id: string
  formatted_number: string
  frozen_data: InvoiceFrozenData
}

// Always re-renders the PDF from frozen_data (a pure, deterministic function
// of already-frozen fields — not a forbidden "regeneration" of an issued
// document, ADR 0002) so a replay always has bytes ready for the email
// attachment. Only calls the File Module if the Invoice doesn't already
// carry a file_id — this is what keeps a replay from creating a second
// stored file.
const renderAndStoreInvoicePdfStep = createStep(
  "render-and-store-invoice-pdf",
  async (input: RenderAndStoreInvoicePdfInput, { container }) => {
    const invoiceService: InvoiceModuleService = container.resolve(INVOICE_MODULE)
    const fileModuleService = container.resolve(Modules.FILE)

    const docDefinition = buildInvoiceDocDefinition(
      input.frozen_data,
      input.formatted_number
    )
    const pdf_base64 = await renderPdfDocDefinitionToBase64(docDefinition)

    const [invoice] = await invoiceService.listInvoices({ id: input.invoice_id })
    if (invoice?.file_id) {
      return new StepResponse({ file_id: invoice.file_id, pdf_base64 })
    }

    const file = await fileModuleService.createFiles({
      filename: `facture-${input.formatted_number}.pdf`,
      mimeType: "application/pdf",
      content: pdf_base64,
      access: "private",
    })

    await invoiceService.updateInvoices({ id: input.invoice_id, file_id: file.id })

    return new StepResponse({ file_id: file.id, pdf_base64 })
  }
)

type LinkInvoiceToOrderInput = {
  invoice_id: string
  order_id: string
}

// A plain createRemoteLinkStep would throw on replay: this Module Link is
// one-to-one on both sides (src/links/invoice-order.ts), so the Link
// module's own uniqueness check rejects a second `link.create` for an
// order that already has one. This step checks first, like issueInvoice
// checks order_id first — same idempotency discipline, applied to the link.
const linkInvoiceToOrderStep = createStep(
  "link-invoice-to-order",
  async (input: LinkInvoiceToOrderInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "invoice.id"],
      filters: { id: input.order_id },
    })

    if ((orders[0] as any)?.invoice?.id) {
      return new StepResponse({ linked: true })
    }

    const link = container.resolve(ContainerRegistrationKeys.LINK)
    await link.create({
      [INVOICE_MODULE]: { invoice_id: input.invoice_id },
      [Modules.ORDER]: { order_id: input.order_id },
    })

    return new StepResponse({ linked: true })
  }
)

type SendInvoiceEmailInput = {
  order_id: string
  email: string
  display_id: string | number
  formatted_number: string
  pdf_base64: string
}

// Distinct from order-confirmation.ts (spec §"Deux emails au client, par
// conception"): this one fires at payment.captured, carries the Facture,
// and dedupes replays through idempotency_key exactly like
// kitchen-ticket-notification.ts.
const sendInvoiceEmailStep = createStep(
  "send-invoice-email",
  async (input: SendInvoiceEmailInput, { container }) => {
    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: input.email,
      channel: "email",
      template: "invoice-notification",
      idempotency_key: `invoice:${input.order_id}`,
      data: {
        order_id: input.display_id,
        formatted_number: input.formatted_number,
      },
      attachments: [
        {
          filename: `facture-${input.formatted_number}.pdf`,
          content: input.pdf_base64,
          content_type: "application/pdf",
          disposition: "attachment",
        },
      ],
    })

    return new StepResponse({ sent: true })
  }
)

export const issueInvoiceWorkflow = createWorkflow(
  "issue-invoice",
  function (input: IssueInvoiceWorkflowInput) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "created_at",
        // "tax_total" isn't read directly below — its presence in this list
        // is what makes the Order module compute and attach totals at all
        // (OrderModuleService.shouldIncludeTotals matches literal top-level
        // total field names). Without it, items end up unmerged with their
        // LineItem side (no unit_price) and items.subtotal /
        // items.tax_lines.total silently come back as 0 — verified by
        // running this workflow end-to-end (Seam 1, invoice-issue.spec.ts).
        // "items.*" (not cherry-picked fields) is what makes the Order
        // module populate and merge the LineItem/OrderItem "detail" pair
        // correctly; requesting individual dotted fields here left
        // `unit_price` (and so `subtotal`) unpopulated in the same test.
        "tax_total",
        "items.*",
        "items.tax_lines.*",
        "shipping_address.*",
      ],
      filters: { id: input.order_id },
    })

    const issuerConfig = loadIssuerConfigStep(input)

    const derived = transform({ orders, issuerConfig }, (data) => {
      const order = data.orders[0] as any
      const issuedAt = new Date()

      const frozen_data = deriveInvoiceFrozenData({
        order: {
          items: (order.items ?? []).map((item: any) => ({
            title: item.title,
            quantity: lineItemQuantity(item),
            subtotal: item.subtotal,
            tax_lines: item.tax_lines,
          })),
          shipping_address: order.shipping_address,
          created_at: order.created_at,
        },
        issuer: {
          legal_name: data.issuerConfig.legal_name,
          address: data.issuerConfig.address,
          siren: data.issuerConfig.siren,
          siret: data.issuerConfig.siret,
          vat_number: data.issuerConfig.vat_number,
          legal_form: data.issuerConfig.legal_form,
          share_capital: data.issuerConfig.share_capital,
          rcs_city: data.issuerConfig.rcs_city,
        },
        issuedAt,
      })

      return {
        frozen_data,
        year: invoiceIssuanceYear(issuedAt),
      }
    })

    const invoiceInput = transform({ input, derived }, (data) => ({
      order_id: data.input.order_id,
      year: data.derived.year,
      frozen_data: data.derived.frozen_data,
    }))

    const invoice = issueInvoiceStep(invoiceInput)

    const pdfInput = transform({ invoice, derived }, (data) => ({
      invoice_id: data.invoice.id,
      formatted_number: data.invoice.formatted_number,
      frozen_data: data.derived.frozen_data,
    }))
    const pdf = renderAndStoreInvoicePdfStep(pdfInput)

    const linkInput = transform({ invoice, input }, (data) => ({
      invoice_id: data.invoice.id,
      order_id: data.input.order_id,
    }))
    linkInvoiceToOrderStep(linkInput)

    const emailInput = transform({ orders, invoice, pdf }, (data) => ({
      order_id: data.orders[0].id,
      email: (data.orders[0] as any).email,
      display_id: (data.orders[0] as any).display_id,
      formatted_number: data.invoice.formatted_number,
      pdf_base64: data.pdf.pdf_base64,
    }))
    sendInvoiceEmailStep(emailInput)

    return new WorkflowResponse({ invoice })
  }
)

export default issueInvoiceWorkflow
