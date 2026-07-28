import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
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
import { parisDayOfWeek } from "./paris-time"
import { waitForOrderPlacedToSettle } from "./wait-for-order-placed"

// Ticket 09 ("la déconnexion garde le panier"): keeping the cart alive past
// logout means the cart's customer_id/email — pinned there by the native
// transfer route at login — must be explicitly cleared, or a guest checkout
// completed later on that same cart still writes onto the departed
// customer's Client record. See detach-cart-customer.ts (workflow) and its
// store route for the mechanism this file exercises via real HTTP calls,
// never the workflow's internal steps (AGENTS.md).

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any
    const customer = () =>
      getContainer().resolve(Modules.CUSTOMER) as ICustomerModuleService

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

    async function setUpPickupSlot() {
      const now = new Date()
      await pickup().createPickupConfigs({
        prep_delay_minutes: 0,
        slot_duration_minutes: 1,
        restaurant_notification_email: "cuisine@example.com",
      })
      await pickup().createPickupSchedules({
        day_of_week: parisDayOfWeek(now),
        start_time: "00:00",
        end_time: "23:59",
        active: true,
      })
    }

    async function registerCustomer(
      publishableKey: string,
      fields: {
        email: string
        password: string
        first_name: string
        last_name: string
        phone: string
      }
    ) {
      const storeHeaders = { headers: { "x-publishable-api-key": publishableKey } }

      const { data: registerData } = await api.post(
        "/auth/customer/emailpass/register",
        { email: fields.email, password: fields.password }
      )

      await api.post(
        "/store/customers",
        {
          email: fields.email,
          first_name: fields.first_name,
          last_name: fields.last_name,
          phone: fields.phone,
        },
        {
          headers: {
            ...storeHeaders.headers,
            Authorization: `Bearer ${registerData.token}`,
          },
        }
      )

      const { data: loginData } = await api.post("/auth/customer/emailpass", {
        email: fields.email,
        password: fields.password,
      })

      const { data: customerData } = await api.get("/store/customers/me", {
        headers: {
          ...storeHeaders.headers,
          Authorization: `Bearer ${loginData.token}`,
        },
      })

      return {
        token: loginData.token as string,
        customerId: customerData.customer.id as string,
      }
    }

    async function createGuestCartWithItem(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>
    ) {
      const { data: createData } = await api.post(
        "/store/carts",
        {
          region_id: commerce.regionId,
          sales_channel_id: commerce.salesChannelId,
          currency_code: "eur",
          items: [{ variant_id: commerce.variantId, quantity: 2 }],
        },
        { headers: { "x-publishable-api-key": commerce.publishableKey } }
      )
      return createData.cart.id as string
    }

    describe("detach-cart-customer (ticket 09, closing the identity leak)", () => {
      it("clears customer_id, email and addresses, but keeps the line items", async () => {
        const commerce = await setUpCommerce()
        const storeHeaders = {
          headers: { "x-publishable-api-key": commerce.publishableKey },
        }

        const { token, customerId } = await registerCustomer(
          commerce.publishableKey,
          {
            email: "amelie@example.com",
            password: "un-mot-de-passe-solide",
            first_name: "Amélie",
            last_name: "Poulain",
            phone: "0102030405",
          }
        )

        const cartId = await createGuestCartWithItem(commerce)

        await api.post(
          `/store/carts/${cartId}/customer`,
          {},
          { headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` } }
        )
        await api.post(
          `/store/carts/${cartId}`,
          {
            shipping_address: {
              country_code: "fr",
              first_name: "Amélie",
              last_name: "Poulain",
              address_1: "1 rue de la Paix",
              city: "Paris",
              postal_code: "75001",
            },
          },
          { headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` } }
        )

        const { data: beforeDetach } = await api.get(
          `/store/carts/${cartId}?fields=+customer_id,items.quantity`,
          storeHeaders
        )
        expect(beforeDetach.cart.customer_id).toEqual(customerId)
        expect(beforeDetach.cart.items).toHaveLength(1)

        await api.delete(
          `/store/customers/me/carts/${cartId}/customer`,
          { headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` } }
        )

        const { data: afterDetach } = await api.get(
          `/store/carts/${cartId}?fields=+customer_id,+email`,
          storeHeaders
        )
        expect(afterDetach.cart.customer_id).not.toEqual(customerId)
        expect(afterDetach.cart.email).toBeFalsy()
        expect(afterDetach.cart.shipping_address).toBeFalsy()
        expect(afterDetach.cart.items).toHaveLength(1)
        expect(afterDetach.cart.items[0].quantity).toEqual(2)
      })

      it("is a no-op the second time (idempotent, doesn't throw)", async () => {
        const commerce = await setUpCommerce()
        const storeHeaders = {
          headers: { "x-publishable-api-key": commerce.publishableKey },
        }

        const { token } = await registerCustomer(commerce.publishableKey, {
          email: "hugo@example.com",
          password: "un-mot-de-passe-solide",
          first_name: "Hugo",
          last_name: "Martin",
          phone: "0102030405",
        })

        const cartId = await createGuestCartWithItem(commerce)
        await api.post(
          `/store/carts/${cartId}/customer`,
          {},
          { headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` } }
        )

        await api.delete(`/store/customers/me/carts/${cartId}/customer`, {
          headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` },
        })

        await expect(
          api.delete(`/store/customers/me/carts/${cartId}/customer`, {
            headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` },
          })
        ).resolves.toMatchObject({ status: 200 })
      })

      it("refuses to detach a cart attached to a different customer", async () => {
        const commerce = await setUpCommerce()
        const storeHeaders = {
          headers: { "x-publishable-api-key": commerce.publishableKey },
        }

        const { token: ownerToken } = await registerCustomer(
          commerce.publishableKey,
          {
            email: "owner@example.com",
            password: "un-mot-de-passe-solide",
            first_name: "Owner",
            last_name: "Real",
            phone: "0102030405",
          }
        )
        const { token: strangerToken } = await registerCustomer(
          commerce.publishableKey,
          {
            email: "stranger@example.com",
            password: "un-mot-de-passe-solide",
            first_name: "Stranger",
            last_name: "Danger",
            phone: "0102030405",
          }
        )

        const cartId = await createGuestCartWithItem(commerce)
        await api.post(
          `/store/carts/${cartId}/customer`,
          {},
          { headers: { ...storeHeaders.headers, Authorization: `Bearer ${ownerToken}` } }
        )

        await expect(
          api.delete(`/store/customers/me/carts/${cartId}/customer`, {
            headers: {
              ...storeHeaders.headers,
              Authorization: `Bearer ${strangerToken}`,
            },
          })
        ).rejects.toMatchObject({
          response: { status: 400, data: { message: expect.any(String) } },
        })

        // The real owner's attachment must survive the stranger's refused
        // attempt untouched.
        const { data: afterAttempt } = await api.get(
          `/store/carts/${cartId}?fields=+customer_id`,
          storeHeaders
        )
        expect(afterAttempt.cart.customer_id).toBeTruthy()
      })

      it("the full round-trip — compose, log in, log out (detach), order as guest — never writes on the departed customer's Client", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()
        const storeHeaders = {
          headers: { "x-publishable-api-key": commerce.publishableKey },
        }

        const { token, customerId } = await registerCustomer(
          commerce.publishableKey,
          {
            email: "marie@example.com",
            password: "un-mot-de-passe-solide",
            first_name: "Marie",
            last_name: "Curie",
            phone: "0102030405",
          }
        )
        await api.post(
          "/store/customers/me/addresses",
          {
            is_default_billing: true,
            country_code: "fr",
            first_name: "Marie",
            last_name: "Curie",
            address_1: "1 rue de la Paix",
            city: "Paris",
            postal_code: "75001",
          },
          { headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` } }
        )

        // Compose a cart, then log in (native transfer pins customer_id).
        const cartId = await createGuestCartWithItem(commerce)
        await api.post(
          `/store/carts/${cartId}/customer`,
          {},
          { headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` } }
        )

        // Log out: this is what the storefront's signout() now does before
        // dropping the auth token.
        await api.delete(`/store/customers/me/carts/${cartId}/customer`, {
          headers: { ...storeHeaders.headers, Authorization: `Bearer ${token}` },
        })

        // Someone continues the SAME cart as a guest, with a different
        // address, and completes checkout — no Authorization header at all.
        await api.post(
          `/store/carts/${cartId}`,
          {
            email: "invite@example.com",
            shipping_address: {
              country_code: "fr",
              first_name: "Pierre",
              last_name: "Voisin",
              phone: "0607080910",
              address_1: "10 avenue des Champs-Élysées",
              city: "Paris",
              postal_code: "75008",
            },
          },
          storeHeaders
        )

        const { data: slotsResponse } = await api.get("/store/pickup-slots", {
          headers: storeHeaders.headers,
        })
        const chosenSlot = slotsResponse.slots[0]
        await api.post(
          `/store/carts/${cartId}`,
          {
            metadata: {
              creneau_debut: chosenSlot.start,
              creneau_fin: chosenSlot.end,
            },
          },
          storeHeaders
        )
        await api.post(
          `/store/carts/${cartId}/shipping-methods`,
          { option_id: commerce.pickupShippingOptionId },
          storeHeaders
        )
        const { data: paymentCollectionData } = await api.post(
          "/store/payment-collections",
          { cart_id: cartId },
          storeHeaders
        )
        await api.post(
          `/store/payment-collections/${paymentCollectionData.payment_collection.id}/payment-sessions`,
          { provider_id: "pp_system_default" },
          storeHeaders
        )

        const { data: completeData } = await api.post(
          `/store/carts/${cartId}/complete?fields=+customer_id,+items.quantity`,
          {},
          storeHeaders
        )
        const order = completeData.order

        await waitForOrderPlacedToSettle(getContainer(), order.id, {
          minNotifications: 2,
        })

        // Items composed before login survive the whole round-trip.
        expect(order.items).toHaveLength(1)
        expect(order.items[0].quantity).toEqual(2)

        // The order must NOT be attributed to Marie: she was never
        // authenticated for this checkout.
        expect(order.customer_id).not.toEqual(customerId)

        // Marie's saved billing address must be untouched by a checkout she
        // had no part in.
        const [marieAddress] = await customer().listCustomerAddresses({
          customer_id: customerId,
          is_default_billing: true,
        })
        expect(marieAddress.address_1).toEqual("1 rue de la Paix")
        expect(marieAddress.postal_code).toEqual("75001")

        const [marieRecord] = await customer().listCustomers({
          id: customerId,
        })
        expect(marieRecord.last_name).toEqual("Curie")
      })
    })
  },
})
