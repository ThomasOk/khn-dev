import { Modules } from "@medusajs/framework/utils"
import type {
  CustomerAddressDTO,
  ICustomerModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"

// customer-billing-address-sync.ts fires on order.placed and, like the other
// three subscribers on that event (wait-for-order-placed.ts), settles after
// the HTTP response returns. There is no notification to poll here — the
// effect is the Customer's own default billing address — so poll that
// directly until `predicate` matches, rather than guessing at timing.
export async function waitForBillingAddressSync(
  container: MedusaContainer,
  customerId: string,
  predicate: (address: CustomerAddressDTO) => boolean,
  timeoutMs = 10_000
) {
  const customerModuleService: ICustomerModuleService = container.resolve(
    Modules.CUSTOMER
  )
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const [address] = await customerModuleService.listCustomerAddresses({
      customer_id: customerId,
      is_default_billing: true,
    })
    if (address && predicate(address)) {
      return address
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(
    `Timed out waiting for the billing address sync of customer ${customerId}`
  )
}
