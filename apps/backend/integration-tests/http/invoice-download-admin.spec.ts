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
import { createAdminSession } from "./create-admin-session"

// Ticket 04 (spec §"Pour le restaurateur", User Stories 15-16): once
// payment.captured has issued a Facture (ticket 03), the restaurateur must
// be able to find and re-download it from the admin Commande page — the
// exact bytes stored at issuance, never a fresh render. Same commerce
// fixture and "poll the persisted side effect" discipline as
// invoice-issue.spec.ts; this file adds a real admin session on top so the
// two new routes are hit exactly as the OrderInvoiceWidget hits them.

jest.setTimeout(60 * 1000)

const CLIENT_EMAIL = "client@example.com"
const RESTAURANT_EMAIL = "cuisine@example.com"
const ADMIN_EMAIL = "admin@example.com"
const ADMIN_PASSWORD = "supersecret"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any
    const invoice = () => getContainer().resolve(INVOICE_MODULE) as any

    // Same minimal click & collect commerce fixture as invoice-issue.spec.ts.
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

    describe("GET /admin/orders/:id/invoice(/download)", () => {
      it("returns the issued Facture's number and the exact stored bytes", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupConfigAndSlot()
        await setUpIssuerConfig()
        const admin = await createAdminSession(
          api,
          getContainer(),
          ADMIN_EMAIL,
          ADMIN_PASSWORD
        )

        const order = await completeCartWithSlot(commerce)
        const { invoice: issuedInvoice } = await waitForInvoiceIssued(
          getContainer(),
          order.id
        )

        const { data: infoData } = await api.get(
          `/admin/orders/${order.id}/invoice`,
          admin
        )
        expect(infoData.invoice.formatted_number).toEqual(
          issuedInvoice.formatted_number
        )

        const downloadResponse = await api.get(
          `/admin/orders/${order.id}/invoice/download`,
          { ...admin, responseType: "arraybuffer" }
        )
        expect(downloadResponse.headers["content-type"]).toEqual(
          "application/pdf"
        )
        expect(downloadResponse.headers["content-disposition"]).toContain(
          `facture-${issuedInvoice.formatted_number}.pdf`
        )

        const fileModuleService = getContainer().resolve(Modules.FILE)
        const storedBytes = await fileModuleService.getAsBuffer(
          issuedInvoice.file_id
        )
        expect(Buffer.from(downloadResponse.data).equals(storedBytes)).toBe(
          true
        )
      })

      it("shows no download link — invoice is null — on a Commande without a Facture", async () => {
        const admin = await createAdminSession(
          api,
          getContainer(),
          ADMIN_EMAIL,
          ADMIN_PASSWORD
        )

        const { data: infoData } = await api.get(
          "/admin/orders/order_does_not_exist/invoice",
          admin
        )
        expect(infoData.invoice).toBeNull()

        await expect(
          api.get(
            "/admin/orders/order_does_not_exist/invoice/download",
            admin
          )
        ).rejects.toMatchObject({
          response: { status: 404 },
        })
      })
    })
  },
})
