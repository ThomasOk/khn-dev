import { createElement } from "react"
import { render } from "@react-email/render"

import OrderConfirmationEmail, {
  OrderItem,
} from "../order-confirmation"

// JSX would need a .tsx file, which jest.config.js's unit matcher
// (**/src/**/__tests__/**/*.unit.spec.[jt]s) doesn't pick up — hence
// createElement here.
function renderEmail(items: OrderItem[]): Promise<string> {
  return render(
    createElement(OrderConfirmationEmail, {
      order_id: 11,
      created_at: "2026-08-15T00:00:00Z",
      currency: "eur",
      total: 34.3,
      subtotal: 34.3,
      shipping_total: 0,
      tax_breakdown: [],
      items,
    })
  )
}

// Shape copied from a real order's line items: Medusa fills `subtitle` with
// the same string as `variant_title`, so suppressing only one of the two
// leaves "Default variant" on the customer's email (the bug this covers).
const defaultVariantItem: OrderItem = {
  id: "1",
  title: "Bière Asahi",
  subtitle: "Default variant",
  variant_title: "Default variant",
  quantity: 1,
  unit_price: 4.9,
  total: 4.9,
}

describe("OrderConfirmationEmail", () => {
  it("never shows Medusa's auto-generated \"Default variant\" label", async () => {
    const html = await renderEmail([defaultVariantItem])

    expect(html).toContain("Bière Asahi")
    expect(html).not.toContain("Default variant")
  })

  it("suppresses it for a Formule too", async () => {
    const html = await renderEmail([
      {
        ...defaultVariantItem,
        id: "2",
        title: "Formule Expérience",
        is_formule: true,
      },
    ])

    expect(html).toContain("Formule Expérience")
    expect(html).not.toContain("Default variant")
  })

  it("still shows a real variant title", async () => {
    const html = await renderEmail([
      {
        ...defaultVariantItem,
        title: "Banh Sung",
        subtitle: "Porc",
        variant_title: "Porc",
      },
    ])

    expect(html).toContain("Porc")
  })

  // A Formule's monogram tile stands in for a product image (ADR 0001) and
  // shares its column, so it has to occupy the same box: react-email's
  // Section defaults (align="center", width="100%") would indent it 8px past
  // every image and stretch it full-width in Outlook.
  it("left-aligns a Formule's tile like the product images it sits with", async () => {
    const html = await renderEmail([
      { ...defaultVariantItem, id: "2", title: "Formule Expérience", is_formule: true },
    ])

    expect(html).toMatch(/<table align="left" width="64"[^>]*background-color:#0C3A3D/)
  })
})
