import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { ICustomerModuleService } from "@medusajs/framework/types"

export type SyncCustomerBillingAddressFromOrderWorkflowInput = {
  order_id: string
}

type OrderShippingAddressFields = {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
}

type UpsertCustomerBillingAddressStepInput = {
  customer_id: string
  address: OrderShippingAddressFields
}

// "La dernière servie" (ticket 03, ADR 0011 "Why the Adresse de facturation
// is written silently"): a Client carries at most one billing address,
// ever — never a second row alongside it. That rules out routing this
// through createCustomerAddressesWorkflow / updateCustomerAddressesWorkflow:
// both only ever unset an existing is_default_billing flag, they never
// delete the row it was on, so calling create every time would grow exactly
// the address book the domain forbids. This step reads the current default
// first and either updates it in place or creates the first one — never
// both — the same one-atomic-write discipline as issueInvoiceStep
// (issue-invoice.ts).
const upsertCustomerBillingAddressStep = createStep(
  "upsert-customer-billing-address",
  async (input: UpsertCustomerBillingAddressStepInput, { container }) => {
    const customerModuleService: ICustomerModuleService = container.resolve(
      Modules.CUSTOMER
    )

    const [existing] = await customerModuleService.listCustomerAddresses({
      customer_id: input.customer_id,
      is_default_billing: true,
    })

    if (existing) {
      await customerModuleService.updateCustomerAddresses(
        existing.id,
        input.address
      )
    } else {
      await customerModuleService.createCustomerAddresses({
        customer_id: input.customer_id,
        is_default_billing: true,
        ...input.address,
      })
    }

    // Spec §"Backend — l'adresse suit la Commande": the nom and téléphone
    // carried by the Commande land on the Client too, not only on the
    // address.
    await customerModuleService.updateCustomers(input.customer_id, {
      first_name: input.address.first_name,
      last_name: input.address.last_name,
      phone: input.address.phone,
    })

    return new StepResponse({ synced: true })
  }
)

// Fourth subscriber on order.placed (spec §"Backend — l'adresse suit la
// Commande"), but the ONLY logic here — the subscriber itself only calls
// this workflow (AGENTS.md: no chained service calls in a subscriber).
//
// A guest Commande (no customer_id) is a no-op, handled here rather than by
// the subscriber skipping the call — the rule ("une Commande passée en
// invité n'écrit sur personne") belongs with the rest of the business logic.
// acceptOrderTransferWorkflow never emits an event (ADR 0011), so a rattaché
// Commande never re-runs this workflow: that's deliberate, not a gap — the
// account created after payment writes the address itself, from the order
// it already has in hand (ticket 07).
export const syncCustomerBillingAddressFromOrderWorkflow = createWorkflow(
  "sync-customer-billing-address-from-order",
  function (input: SyncCustomerBillingAddressFromOrderWorkflowInput) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "customer.has_account",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.phone",
        "shipping_address.company",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.province",
        "shipping_address.postal_code",
        "shipping_address.country_code",
      ],
      filters: { id: input.order_id },
    })

    // A guest Commande still carries a customer_id: createCartWorkflow's
    // findOrCreateCustomerStep always attaches one, creating a
    // has_account:false shadow Customer from the cart's email when there is
    // no authenticated actor (@medusajs/core-flows,
    // cart/steps/find-or-create-customer.ts). That shadow record is not a
    // Client in this domain's glossary — only has_account:true is — so the
    // condition checks it explicitly rather than customer_id alone; testing
    // only customer_id would silently write on every guest order's shadow
    // Customer, exactly what "une Commande passée en invité n'écrit sur
    // personne" forbids.
    const result = when(
      orders,
      (orders) => !!(orders[0] as any)?.customer?.has_account
    ).then(() => {
      const upsertInput = transform({ orders }, ({ orders }) => {
        const order = orders[0] as any
        const address = order.shipping_address ?? {}
        return {
          customer_id: order.customer_id as string,
          address: {
            first_name: address.first_name ?? null,
            last_name: address.last_name ?? null,
            phone: address.phone ?? null,
            company: address.company ?? null,
            address_1: address.address_1 ?? null,
            address_2: address.address_2 ?? null,
            city: address.city ?? null,
            province: address.province ?? null,
            postal_code: address.postal_code ?? null,
            country_code: address.country_code ?? null,
          },
        }
      })

      return upsertCustomerBillingAddressStep(upsertInput)
    })

    // `result` is undefined at runtime whenever the `when` above didn't run
    // (guest Commande) — normalized here rather than typed as optional,
    // the same "read a possibly-skipped when() result safely" pattern as
    // reserve-table.ts's own use of transform.
    const output = transform({ result }, (data) => ({
      synced: !!data.result?.synced,
    }))

    return new WorkflowResponse(output)
  }
)

export default syncCustomerBillingAddressFromOrderWorkflow
