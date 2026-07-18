import { lineItemQuantity } from "../line-item-quantity"

describe("lineItemQuantity", () => {
  it("prefers the OrderItem detail's quantity when present", () => {
    expect(lineItemQuantity({ quantity: 1, detail: { quantity: 3 } })).toEqual(3)
  })

  it("falls back to the line item's own quantity when there is no detail", () => {
    expect(lineItemQuantity({ quantity: 2, detail: null })).toEqual(2)
    expect(lineItemQuantity({ quantity: 2 })).toEqual(2)
  })
})
