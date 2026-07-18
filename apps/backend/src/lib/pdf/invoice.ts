import { RESTAURANT_TIMEZONE } from "../time/timezone"
import { InvoiceFrozenData } from "../invoice/frozen-data"
import { PdfMakeDocDefinition } from "./render"

const amountFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
})
const rateFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: RESTAURANT_TIMEZONE,
  dateStyle: "long",
})

function formatAmount(value: number): string {
  return amountFormatter.format(value)
}

function formatRate(rate: number): string {
  return `${rateFormatter.format(rate)} %`
}

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

const tableHeader = (labels: string[]) => labels.map((text) => ({ text, bold: true }))

// Pure: frozen_data (+ the formatted number attributed by issueInvoice,
// spec §"Attribution atomique du numéro") -> pdfmake docDefinition. Shares
// only the rendering engine with the Ticket cuisine template
// (kitchen-ticket.ts), never a template (CONTEXT.md).
export function buildInvoiceDocDefinition(
  frozenData: InvoiceFrozenData,
  formattedNumber: string
): PdfMakeDocDefinition {
  const { issuer, customer, document, lines, tax_breakdown, totals } = frozenData
  const billingAddress = customer.billing_address

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    content: [
      { text: "Facture", fontSize: 18, bold: true },
      { text: formattedNumber, fontSize: 12, margin: [0, 2, 0, 12] },

      {
        columns: [
          {
            width: "*",
            stack: [
              { text: issuer.legal_name, bold: true },
              { text: issuer.address },
              { text: `SIREN ${issuer.siren} — SIRET ${issuer.siret}` },
              { text: `TVA intracommunautaire : ${issuer.vat_number}` },
              { text: `${issuer.legal_form} au capital de ${issuer.share_capital}` },
              { text: `RCS ${issuer.rcs_city}` },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "Facturé à", bold: true },
              { text: customer.name },
              ...(billingAddress.company ? [{ text: billingAddress.company }] : []),
              ...(billingAddress.address_1 ? [{ text: billingAddress.address_1 }] : []),
              ...(billingAddress.address_2 ? [{ text: billingAddress.address_2 }] : []),
              {
                text: [billingAddress.postal_code, billingAddress.city]
                  .filter(Boolean)
                  .join(" "),
              },
              ...(billingAddress.country_code
                ? [{ text: billingAddress.country_code.toUpperCase() }]
                : []),
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },

      {
        columns: [
          { text: `Date d'émission : ${formatDate(document.issued_at)}` },
          { text: `Date de vente : ${formatDate(document.sale_date)}` },
        ],
        margin: [0, 0, 0, 12],
      },

      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "auto"],
          body: [
            tableHeader(["Désignation", "Qté", "PU HT", "Taux TVA", "Montant TVA"]),
            ...lines.map((line) => [
              line.title,
              String(line.quantity),
              formatAmount(line.unit_price_excl_tax),
              formatRate(line.tax_rate),
              formatAmount(line.tax_amount),
            ]),
          ],
        },
        margin: [0, 0, 0, 12],
      },

      { text: "Ventilation TVA par taux", bold: true, margin: [0, 0, 0, 4] },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "auto", "auto"],
          body: [
            tableHeader(["Taux", "Total HT", "Total TVA", "Total TTC"]),
            ...tax_breakdown.map((row) => [
              formatRate(row.rate),
              formatAmount(row.subtotal_excl_tax),
              formatAmount(row.tax_amount),
              formatAmount(row.subtotal_incl_tax),
            ]),
          ],
        },
        margin: [0, 0, 0, 12],
      },

      {
        stack: [
          { text: `Total HT : ${formatAmount(totals.total_excl_tax)}` },
          { text: `Total TVA : ${formatAmount(totals.total_tax)}` },
          {
            text: `Total TTC : ${formatAmount(totals.total_incl_tax)}`,
            bold: true,
            fontSize: 11,
          },
        ],
        alignment: "right",
      },
    ],
  }
}
