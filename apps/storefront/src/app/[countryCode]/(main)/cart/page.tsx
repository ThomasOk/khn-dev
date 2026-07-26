import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { retrieveShowcaseFresh } from "@lib/data/showcase"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()
  const showcase = await retrieveShowcaseFresh()

  return (
    <CartTemplate
      cart={cart}
      customer={customer}
      orderPossible={!showcase.showcase_mode}
      showcaseNote={showcase.note}
    />
  )
}
