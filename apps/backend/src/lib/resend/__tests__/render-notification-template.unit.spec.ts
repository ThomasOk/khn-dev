import { MedusaError } from "@medusajs/framework/utils"
import { renderNotificationTemplate } from "../render-notification-template"

const KNOWN_TEMPLATES: Array<{
  template: string
  data: Record<string, unknown>
  expectedSubject: string
}> = [
  {
    template: "order-confirmation",
    data: {
      order_id: "1001",
      created_at: "2026-07-20T10:00:00.000Z",
      currency: "eur",
      total: 1000,
      subtotal: 900,
      shipping_total: 0,
      tax_breakdown: [{ rate: 10, amount: 100 }],
      items: [],
    },
    expectedSubject: "Confirmation de commande #1001",
  },
  {
    template: "kitchen-ticket-notification",
    data: {
      order_id: "1001",
      customer_name: "Alix Dupont",
      pickup_slot_start: "2026-07-20T10:00:00.000+02:00",
      pickup_slot_end: "2026-07-20T10:15:00.000+02:00",
      items: [],
    },
    expectedSubject: "Nouvelle commande #1001",
  },
  {
    template: "invoice-notification",
    data: {
      order_id: "1001",
      formatted_number: "F-2026-00042",
    },
    expectedSubject: "Votre facture F-2026-00042 — commande #1001",
  },
  {
    template: "table-reservation-confirmation",
    data: {
      customer_name: "Alix Dupont",
      date: "2026-08-12",
      time: "20:00",
      party_size: 4,
      restaurant_phone: "+33400000000",
      cancellation_url: "https://example.com/cancel/abc",
    },
    expectedSubject: "Votre réservation chez Kim-Hi Noodle est confirmée",
  },
  {
    template: "table-reservation-notification",
    data: {
      customer_name: "Alix Dupont",
      customer_phone: "+33600000000",
      date: "2026-08-12",
      time: "20:00",
      party_size: 4,
    },
    expectedSubject: "[Réservation] 12/08 20h00 — 4 pers. — Alix Dupont",
  },
  {
    template: "table-reservation-cancellation-notification",
    data: {
      customer_name: "Alix Dupont",
      customer_phone: "+33600000000",
      date: "2026-08-12",
      time: "20:00",
      party_size: 4,
    },
    expectedSubject: "[Annulation] 12/08 20h00 — 4 pers. — Alix Dupont",
  },
]

describe("renderNotificationTemplate", () => {
  it.each(KNOWN_TEMPLATES)(
    "renders $template with its own subject and body, unchanged",
    async ({ template, data, expectedSubject }) => {
      const { subject, html } = await renderNotificationTemplate(template, data)

      expect(subject).toEqual(expectedSubject)
      expect(subject).not.toEqual("Notification")
      expect(html).not.toEqual("<p>Vous avez une nouvelle notification.</p>")
      expect(html.length).toBeGreaterThan(0)
    }
  )

  it("throws instead of falling back to a generic email for an unknown template", async () => {
    await expect(
      renderNotificationTemplate("some-misspelled-template", {})
    ).rejects.toThrow(MedusaError)
  })

  it("names the unknown template in the error so the failure is diagnosable", async () => {
    await expect(
      renderNotificationTemplate("some-misspelled-template", {})
    ).rejects.toThrow(/some-misspelled-template/)
  })
})
