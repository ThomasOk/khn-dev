import { HttpTypes } from "@medusajs/types"

// Which checkout step a "go to checkout" link should land on, based on what
// the cart is still missing — shared by the cart page's Summary and the
// Carte's sticky cart column so both send the client to the same place.
export function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}
