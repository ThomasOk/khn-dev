import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { PICKUP_MODULE } from "../../src/modules/pickup"
import { INVOICE_MODULE } from "../../src/modules/invoice"
import { parisDayOfWeek } from "./paris-time"
import { waitForInvoiceIssued } from "./wait-for-invoice-issued"
import { waitForOrderPlacedToSettle } from "./wait-for-order-placed"

// Seam 1 of the spec (ticket 03): pay a cart through the real routes, then —
// once payment.captured has settled — assert what's persisted: an Invoice
// linked to the Order by the Module Link, a formatted number, a non-null
// file_id, a PDF present in the File Module, and a client email notification.
// Prior art: kitchen-ticket-notification.spec.ts (same commerce fixture,
// same "poll the concrete side effect" discipline as
// wait-for-order-placed.ts).

jest.setTimeout(60 * 1000)

const CLIENT_EMAIL = "client@example.com"
const RESTAURANT_EMAIL = "cuisine@example.com"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer, utils }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any
    const invoice = () => getContainer().resolve(INVOICE_MODULE) as any

    // Same minimal click & collect commerce fixture as
    // kitchen-ticket-notification.spec.ts / complete-cart.spec.ts.
    async function setUpCommerce() {
      const container = getContainer()
      const link = container.resolve(ContainerRegistrationKeys.LINK)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

      const [salesChannel] = await salesChannelModule.listSalesChannels({})

      const apiKeyResult = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: "test", type: "publishable", created_by: "test" },
          ],
        },
      })
      const publishableKey = apiKeyResult.result[0].token

      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: apiKeyResult.result[0].id, add: [salesChannel.id] },
      })

      const regionResult = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "France",
              currency_code: "eur",
              countries: ["fr"],
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      })
      const region = regionResult.result[0]

      const stockLocationResult = await createStockLocationsWorkflow(
        container
      ).run({
        input: {
          locations: [
            {
              name: "Restaurant",
              address: { country_code: "FR", city: "Paris", address_1: "" },
            },
          ],
        },
      })
      const stockLocation = stockLocationResult.result[0]

      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      })

      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: stockLocation.id, add: [salesChannel.id] },
      })

      const shippingProfileResult = await createShippingProfilesWorkflow(
        container
      ).run({
        input: { data: [{ name: "Default", type: "default" }] },
      })
      const shippingProfile = shippingProfileResult.result[0]

      const pickupFulfillmentSet =
        await fulfillmentModule.createFulfillmentSets({
          name: "Retrait au restaurant",
          type: "pickup",
          service_zones: [
            {
              name: "France",
              geo_zones: [{ country_code: "fr", type: "country" }],
            },
          ],
        })

      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: pickupFulfillmentSet.id },
      })

      const shippingOptionResult = await createShippingOptionsWorkflow(
        container
      ).run({
        input: [
          {
            name: "Retrait au restaurant",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: pickupFulfillmentSet.service_zones[0].id,
            shipping_profile_id: shippingProfile.id,
            type: {
              label: "Retrait",
              description: "Retrait au restaurant.",
              code: "pickup",
            },
            prices: [{ currency_code: "eur", amount: 0 }],
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
        ],
      })
      const pickupShippingOption = shippingOptionResult.result[0]

      const productResult = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Plat du jour",
              status: "published" as any,
              shipping_profile_id: shippingProfile.id,
              options: [{ title: "Taille", values: ["Unique"] }],
              variants: [
                {
                  title: "Unique",
                  sku: "PLAT-DU-JOUR",
                  options: { Taille: "Unique" },
                  prices: [{ amount: 12, currency_code: "eur" }],
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
          ],
        },
      })
      const variant = productResult.result[0].variants[0]

      const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
        filters: { sku: "PLAT-DU-JOUR" },
      })

      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: inventoryItems.map((item) => ({
            location_id: stockLocation.id,
            stocked_quantity: 1000,
            inventory_item_id: item.id,
          })),
        },
      })

      return {
        publishableKey,
        regionId: region.id,
        salesChannelId: salesChannel.id,
        variantId: variant.id,
        pickupShippingOptionId: pickupShippingOption.id,
      }
    }

    async function createReadyCart(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>
    ) {
      const headers = {
        headers: { "x-publishable-api-key": commerce.publishableKey },
      }

      const { data: createData } = await api.post(
        "/store/carts",
        {
          region_id: commerce.regionId,
          sales_channel_id: commerce.salesChannelId,
          currency_code: "eur",
          email: CLIENT_EMAIL,
          items: [{ variant_id: commerce.variantId, quantity: 2 }],
          shipping_address: {
            country_code: "fr",
            first_name: "Marie",
            last_name: "Curie",
            phone: "0102030405",
            address_1: "1 rue de la Paix",
            city: "Paris",
            postal_code: "75001",
          },
        },
        headers
      )
      const cartId = createData.cart.id

      await api.post(
        `/store/carts/${cartId}/shipping-methods`,
        { option_id: commerce.pickupShippingOptionId },
        headers
      )

      const { data: paymentCollectionData } = await api.post(
        "/store/payment-collections",
        { cart_id: cartId },
        headers
      )
      await api.post(
        `/store/payment-collections/${paymentCollectionData.payment_collection.id}/payment-sessions`,
        { provider_id: "pp_system_default" },
        headers
      )

      return { cartId, headers }
    }

    // A currently-offerable slot, the restaurant's notification address, and
    // the Facture's issuer identity (ticket 03: IssuerConfig, prerequisite
    // for issueInvoiceWorkflow) — everything complete-cart.spec.ts's own
    // setup doesn't already provide.
    async function setUpPickupConfigAndSlot() {
      const now = new Date()
      await pickup().createPickupConfigs({
        prep_delay_minutes: 0,
        slot_duration_minutes: 1,
        restaurant_notification_email: RESTAURANT_EMAIL,
      })
      await pickup().createPickupSchedules({
        day_of_week: parisDayOfWeek(now),
        start_time: "00:00",
        end_time: "23:59",
        active: true,
      })
    }

    async function setUpIssuerConfig() {
      await invoice().createIssuerConfigs({
        legal_name: "Kim-Hi Noodle SASU",
        address: "12 rue de la Paix, 75002 Paris",
        siren: "123456789",
        siret: "12345678900012",
        vat_number: "FR12123456789",
        legal_form: "SASU",
        share_capital: "10 000 €",
        rcs_city: "Paris",
      })
    }

    async function completeCartWithSlot(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>
    ) {
      const { data: slotsResponse } = await api.get("/store/pickup-slots", {
        headers: { "x-publishable-api-key": commerce.publishableKey },
      })
      const chosenSlot = slotsResponse.slots[0]

      const { cartId, headers } = await createReadyCart(commerce)

      await api.post(
        `/store/carts/${cartId}`,
        {
          metadata: {
            creneau_debut: chosenSlot.start,
            creneau_fin: chosenSlot.end,
          },
        },
        headers
      )

      const { data: completeData } = await api.post(
        `/store/carts/${cartId}/complete`,
        {},
        headers
      )
      return completeData.order
    }

    describe("payment.captured triggers the invoice-issue subscriber", () => {
      it("issues an Invoice linked to the order, with a stored PDF and a client email carrying it", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupConfigAndSlot()
        await setUpIssuerConfig()

        const order = await completeCartWithSlot(commerce)

        const { invoice: issuedInvoice, notifications } =
          await waitForInvoiceIssued(getContainer(), order.id)

        expect(issuedInvoice).toBeDefined()
        expect(issuedInvoice.formatted_number).toMatch(/^F-\d{4}-\d{6}$/)
        expect(issuedInvoice.file_id).toBeTruthy()

        const fileModuleService = getContainer().resolve(Modules.FILE)
        const file = await fileModuleService.retrieveFile(issuedInvoice.file_id)
        expect(file).toBeDefined()

        const invoiceNotification = notifications.find(
          (n: any) => n.template === "invoice-notification"
        )
        expect(invoiceNotification).toBeDefined()
        expect(invoiceNotification.channel).toEqual("email")
        expect(invoiceNotification.to).toEqual(CLIENT_EMAIL)
        expect(invoiceNotification.idempotency_key).toEqual(`invoice:${order.id}`)
      })

      it("makes the Facture's TTC total equal the amount captured", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupConfigAndSlot()
        await setUpIssuerConfig()

        const order = await completeCartWithSlot(commerce)

        await waitForInvoiceIssued(getContainer(), order.id)

        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const { data: orders } = await query.graph({
          entity: "order",
          fields: [
            "id",
            "invoice.frozen_data",
            "payment_collections.payments.amount",
          ],
          filters: { id: order.id },
        })

        const capturedAmount = Number(
          (orders[0] as any).payment_collections[0].payments[0].amount
        )
        const totalInclTax = (orders[0] as any).invoice.frozen_data.totals
          .total_incl_tax

        expect(totalInclTax).toBeCloseTo(capturedAmount, 2)
      })

      it("does not duplicate the Invoice, its file, or its notification when payment.captured is replayed", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupConfigAndSlot()
        await setUpIssuerConfig()

        const order = await completeCartWithSlot(commerce)

        const { invoice: firstInvoice } = await waitForInvoiceIssued(
          getContainer(),
          order.id
        )

        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const { data: paymentOrders } = await query.graph({
          entity: "order",
          fields: ["id", "payment_collections.payments.id"],
          filters: { id: order.id },
        })
        const paymentId = (paymentOrders[0] as any).payment_collections[0]
          .payments[0].id

        const eventBus = getContainer().resolve(Modules.EVENT_BUS)
        await eventBus.emit({ name: "payment.captured", data: { id: paymentId } })

        await new Promise((resolve) => setTimeout(resolve, 1000))
        await utils.waitWorkflowExecutions()

        const invoiceService = getContainer().resolve(INVOICE_MODULE) as any
        const invoices = await invoiceService.listInvoices({
          order_id: order.id,
        })
        expect(invoices).toHaveLength(1)
        expect(invoices[0].formatted_number).toEqual(
          firstInvoice.formatted_number
        )
        // renderAndStoreInvoicePdfStep only calls the File Module when
        // Invoice.file_id is still empty (issue-invoice.ts) — a stable
        // file_id across the replay is what proves no second file got
        // created (the File Module's own listing API only supports
        // filtering by a single known id, so it can't be counted directly).
        expect(invoices[0].file_id).toEqual(firstInvoice.file_id)

        const notificationService = getContainer().resolve(Modules.NOTIFICATION)
        const notifications = await notificationService.listNotifications({
          template: "invoice-notification",
        })
        expect(notifications).toHaveLength(1)
      })

      it("keeps the issued number and does not block the client confirmation or the kitchen ticket when the invoice email fails", async () => {
        // This test suite never configures a real Resend sender/domain, so
        // the invoice-notification send always fails at the provider (an
        // "Invalid `to` field" rejection for @example.com addresses) —
        // exercising exactly the failure this test targets, for free, on
        // every run. issueInvoiceWorkflow has no compensation on any step
        // after issueInvoice (issue-invoice.ts), so that failure must never
        // undo the allocated number, and — same discipline as
        // kitchen-ticket-notification.ts — it must never reach order.placed's
        // own two subscribers.
        const commerce = await setUpCommerce()
        await setUpPickupConfigAndSlot()
        await setUpIssuerConfig()

        const order = await completeCartWithSlot(commerce)

        const { invoice: issuedInvoice } = await waitForInvoiceIssued(
          getContainer(),
          order.id
        )
        expect(issuedInvoice).toBeDefined()
        expect(issuedInvoice.formatted_number).toMatch(/^F-\d{4}-\d{6}$/)
        expect(issuedInvoice.file_id).toBeTruthy()

        const { notifications } = await waitForOrderPlacedToSettle(
          getContainer(),
          order.id,
          { minNotifications: 2 }
        )
        expect(
          notifications.find((n: any) => n.template === "order-confirmation")
        ).toBeDefined()
        expect(
          notifications.find((n: any) => n.template === "kitchen-ticket-notification")
        ).toBeDefined()
      })
    })
  },
})
