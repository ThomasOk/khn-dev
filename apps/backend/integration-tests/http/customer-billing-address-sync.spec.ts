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
import { INVOICE_MODULE } from "../../src/modules/invoice"
import { parisDayOfWeek } from "./paris-time"
import { waitForBillingAddressSync } from "./wait-for-billing-address-sync"
import { waitForOrderPlacedToSettle } from "./wait-for-order-placed"
import { waitForInvoiceIssued } from "./wait-for-invoice-issued"

// Ticket 03's own seam ("L'adresse suit la Commande"): pay a cart through
// the real routes, then assert what's persisted on the Client — never a
// module method's internals, never the workflow's own steps. Prior art:
// complete-cart.spec.ts (commerce fixture) and invoice-issue.spec.ts (async
// effect of order.placed, polled rather than guessed at).

jest.setTimeout(60 * 1000)

const RESTAURANT_EMAIL = "cuisine@example.com"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any
    const invoice = () => getContainer().resolve(INVOICE_MODULE) as any
    const customer = () =>
      getContainer().resolve(Modules.CUSTOMER) as ICustomerModuleService

    // Same minimal click & collect commerce fixture as complete-cart.spec.ts
    // / invoice-issue.spec.ts.
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
        restaurant_notification_email: RESTAURANT_EMAIL,
      })
      await pickup().createPickupSchedules({
        day_of_week: parisDayOfWeek(now),
        start_time: "00:00",
        end_time: "23:59",
        active: true,
      })
    }

    // Prerequisite for issueInvoiceWorkflow (ticket 03, invoice-issue.spec.ts)
    // — only needed by the test that checks the Facture is unaffected by
    // this ticket's new subscriber.
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

    // Register → create the Client record → log back in for an
    // actor-bound token — the same three-call sequence the storefront's own
    // signup flow makes (apps/storefront/src/lib/data/customer.ts,
    // ADR 0011).
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

    async function createReadyCart(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>,
      options: {
        email: string
        shippingAddress: Record<string, string>
        token?: string
      }
    ) {
      const headers = {
        headers: {
          "x-publishable-api-key": commerce.publishableKey,
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
        },
      }

      const { data: createData } = await api.post(
        "/store/carts",
        {
          region_id: commerce.regionId,
          sales_channel_id: commerce.salesChannelId,
          currency_code: "eur",
          email: options.email,
          items: [{ variant_id: commerce.variantId, quantity: 1 }],
          shipping_address: options.shippingAddress,
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

    async function completeCart(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>,
      options: {
        email: string
        shippingAddress: Record<string, string>
        token?: string
      }
    ) {
      const { data: slotsResponse } = await api.get("/store/pickup-slots", {
        headers: { "x-publishable-api-key": commerce.publishableKey },
      })
      const chosenSlot = slotsResponse.slots[0]

      const { cartId, headers } = await createReadyCart(commerce, options)

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
        `/store/carts/${cartId}/complete?fields=+customer_id`,
        {},
        headers
      )
      const order = completeData.order

      // order.placed has FOUR subscribers now, all asynchronous relative to
      // this HTTP response (wait-for-order-placed.ts). Waiting for them to
      // settle before returning — not just for this test's own assertions —
      // is what keeps the next test's between-test TRUNCATE from racing a
      // still-writing subscriber into a deadlock (same discipline as
      // invoice-issue.spec.ts).
      await waitForOrderPlacedToSettle(getContainer(), order.id, {
        minNotifications: 2,
      })

      return order
    }

    describe("order.placed writes the Client's default billing address", () => {
      it("an authenticated checkout poses the Commande's address as the Client's default billing address", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()

        const { token, customerId } = await registerCustomer(commerce.publishableKey, {
          email: "marie@example.com",
          password: "un-mot-de-passe-solide",
          first_name: "Marie",
          last_name: "Curie",
          phone: "0102030405",
        })

        await completeCart(commerce, {
          email: "marie@example.com",
          shippingAddress: {
            country_code: "fr",
            first_name: "Marie",
            last_name: "Curie",
            phone: "0102030405",
            address_1: "1 rue de la Paix",
            city: "Paris",
            postal_code: "75001",
          },
          token,
        })

        const billingAddress = await waitForBillingAddressSync(
          getContainer(),
          customerId,
          (a) => a.postal_code === "75001"
        )

        expect(billingAddress.address_1).toEqual("1 rue de la Paix")
        expect(billingAddress.city).toEqual("Paris")
        expect(billingAddress.country_code).toEqual("fr")
        expect(billingAddress.is_default_billing).toBe(true)

        // Spec: "Le nom et le téléphone portés par la Commande arrivent
        // aussi sur le Client."
        const [customerRecord] = await customer().listCustomers({
          id: customerId,
        })
        expect(customerRecord.first_name).toEqual("Marie")
        expect(customerRecord.last_name).toEqual("Curie")
        expect(customerRecord.phone).toEqual("0102030405")
      })

      it("a second Commande with a different address replaces the first — the Client never has two", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()

        const { token, customerId } = await registerCustomer(commerce.publishableKey, {
          email: "paul@example.com",
          password: "un-mot-de-passe-solide",
          first_name: "Paul",
          last_name: "Dupont",
          phone: "0102030405",
        })

        await completeCart(commerce, {
          email: "paul@example.com",
          shippingAddress: {
            country_code: "fr",
            first_name: "Paul",
            last_name: "Dupont",
            phone: "0102030405",
            address_1: "1 rue de la Paix",
            city: "Paris",
            postal_code: "75001",
          },
          token,
        })
        await waitForBillingAddressSync(
          getContainer(),
          customerId,
          (a) => a.postal_code === "75001"
        )

        // "Le client qui déménage" (spec §"L'adresse suit la Commande") —
        // « la dernière servie » is the intended behavior, not a bug.
        await completeCart(commerce, {
          email: "paul@example.com",
          shippingAddress: {
            country_code: "fr",
            first_name: "Paul",
            last_name: "Dupont",
            phone: "0607080910",
            address_1: "10 avenue des Champs-Élysées",
            city: "Paris",
            postal_code: "75008",
          },
          token,
        })
        const billingAddress = await waitForBillingAddressSync(
          getContainer(),
          customerId,
          (a) => a.postal_code === "75008"
        )
        expect(billingAddress.address_1).toEqual(
          "10 avenue des Champs-Élysées"
        )
        expect(billingAddress.phone).toEqual("0607080910")

        const allAddresses = await customer().listCustomerAddresses({
          customer_id: customerId,
        })
        expect(allAddresses).toHaveLength(1)
        expect(allAddresses[0].is_default_billing).toBe(true)
      })

      it("an address entered by hand on the profile is replaced by the next Commande's — deliberate, not a bug", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()

        const { token, customerId } = await registerCustomer(commerce.publishableKey, {
          email: "julie@example.com",
          password: "un-mot-de-passe-solide",
          first_name: "Julie",
          last_name: "Martin",
          phone: "0102030405",
        })

        // The "carnet d'adresses" entry point is gone from the storefront
        // (ADR 0011), but the native Store API still accepts a manual write
        // — exactly what a hand-entered profile address would have used.
        await api.post(
          "/store/customers/me/addresses",
          {
            is_default_billing: true,
            country_code: "fr",
            first_name: "Julie",
            last_name: "Martin",
            address_1: "5 rue de Rivoli",
            city: "Paris",
            postal_code: "75004",
          },
          {
            headers: {
              "x-publishable-api-key": commerce.publishableKey,
              Authorization: `Bearer ${token}`,
            },
          }
        )

        await completeCart(commerce, {
          email: "julie@example.com",
          shippingAddress: {
            country_code: "fr",
            first_name: "Julie",
            last_name: "Martin",
            phone: "0102030405",
            address_1: "20 rue de la Paix",
            city: "Paris",
            postal_code: "75002",
          },
          token,
        })

        const billingAddress = await waitForBillingAddressSync(
          getContainer(),
          customerId,
          (a) => a.postal_code === "75002"
        )
        expect(billingAddress.address_1).toEqual("20 rue de la Paix")

        const allAddresses = await customer().listCustomerAddresses({
          customer_id: customerId,
        })
        expect(allAddresses).toHaveLength(1)
      })

      it("a guest Commande writes on no Client", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()

        // createCartWorkflow always attaches a customer_id, even here: with
        // no authenticated actor, findOrCreateCustomerStep creates a
        // has_account:false shadow Customer from the cart's email
        // (@medusajs/core-flows, cart/steps/find-or-create-customer.ts).
        // That's not a Client in this domain's glossary — asserting
        // customer_id is null would be asserting something Medusa itself
        // never guarantees. The behavior this test protects is that the
        // shadow record gets no billing address and stays has_account:false.
        const order = await completeCart(commerce, {
          email: "invite@example.com",
          shippingAddress: {
            country_code: "fr",
            first_name: "Jean",
            last_name: "Invité",
            phone: "0102030405",
            address_1: "1 rue de la Paix",
            city: "Paris",
            postal_code: "75001",
          },
        })

        expect(order.customer_id).toBeTruthy()

        const [shadowCustomer] = await customer().listCustomers({
          id: order.customer_id,
        })
        expect(shadowCustomer.has_account).toBe(false)

        const addresses = await customer().listCustomerAddresses({
          customer_id: order.customer_id,
        })
        expect(addresses).toHaveLength(0)
      })

      it("does not change the Ticket cuisine, the order confirmation, or the Facture", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()
        await setUpIssuerConfig()

        const { token } = await registerCustomer(commerce.publishableKey, {
          email: "sophie@example.com",
          password: "un-mot-de-passe-solide",
          first_name: "Sophie",
          last_name: "Leroux",
          phone: "0102030405",
        })

        const order = await completeCart(commerce, {
          email: "sophie@example.com",
          shippingAddress: {
            country_code: "fr",
            first_name: "Sophie",
            last_name: "Leroux",
            phone: "0102030405",
            address_1: "1 rue de la Paix",
            city: "Paris",
            postal_code: "75001",
          },
          token,
        })

        const { capturedAt, notifications } = await waitForOrderPlacedToSettle(
          getContainer(),
          order.id,
          { minNotifications: 2 }
        )
        expect(capturedAt).not.toBeNull()
        expect(
          notifications.find((n: any) => n.template === "order-confirmation")
        ).toBeDefined()
        expect(
          notifications.find(
            (n: any) => n.template === "kitchen-ticket-notification"
          )
        ).toBeDefined()

        // The Facture (ticket 03's own acceptance criterion: "le Ticket
        // cuisine, la Notification de commande et la Facture sont
        // strictement inchangés") is triggered by payment.captured,
        // downstream of the capture just asserted above — issued exactly as
        // invoice-issue.spec.ts already verifies, undisturbed by this
        // ticket's new order.placed subscriber.
        const { invoice: issuedInvoice } = await waitForInvoiceIssued(
          getContainer(),
          order.id
        )
        expect(issuedInvoice).toBeDefined()
        expect(issuedInvoice.formatted_number).toMatch(/^F-\d{4}-\d{6}$/)
        expect(issuedInvoice.file_id).toBeTruthy()
      })
    })
  },
})
