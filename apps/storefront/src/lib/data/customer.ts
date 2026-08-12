"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { FetchError } from "@medusajs/js-sdk"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  getPendingCustomer,
  removeAuthToken,
  removePendingCustomer,
  setAuthToken,
  setPendingCustomer,
} from "./cookies"

export type CustomerAuthState =
  | { state: "error"; error: string }
  | { state: "verification_required"; email: string }
  | { state: "success" }
  | null

export type ResetPasswordState =
  | { state: "error"; error: string }
  | { state: "success" }
  | null

// Requests a verification email for the given customer. The request must be
// authenticated with a token tied to the auth identity (the token returned by
// register or by a login that requires verification).
async function requestVerificationEmail(email: string, token: string) {
  await sdk.auth.verification.request(
    {
      entity_id: email,
      entity_type: "email",
    },
    {
      authorization: `Bearer ${token}`,
    }
  )
}

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

export async function signup(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password,
    })
  } catch (error) {
    const fetchError = error as FetchError
    // An existing identity (for example, an admin user with the same email) is
    // expected and handled: the customer can still log in to link a customer
    // record. Any other error is surfaced.
    if (
      fetchError.statusText !== "Unauthorized" ||
      fetchError.message !== "Identity with email already exists"
    ) {
      return { state: "error", error: String(error) }
    }
  }

  // Persist the extra signup fields. The customer record is created during
  // login, which is deferred until after email verification when the backend
  // requires it.
  await setPendingCustomer(customerForm)

  // Continue by logging in. The login response tells us whether the backend
  // requires email verification — we don't need a storefront-side flag.
  return completeLogin(customerForm.email, password)
}

export async function login(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  return completeLogin(email, password)
}

// Logs the customer in and reconciles the customer record. The behavior is
// driven entirely by the backend's login response, so it works whether or not
// email verification is enabled.
async function completeLogin(
  email: string,
  password: string
): Promise<CustomerAuthState> {
  let result: Awaited<ReturnType<typeof sdk.auth.login>>

  try {
    result = await sdk.auth.login("customer", "emailpass", { email, password })
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  // A `location` is returned by third-party auth providers, which this flow
  // doesn't support.
  if (typeof result === "object" && "location" in result) {
    return {
      state: "error",
      error: "Ce mode de connexion n'est pas pris en charge par le site.",
    }
  }

  // The backend requires email verification and the customer hasn't verified
  // yet. Send the verification email and ask them to check their inbox.
  if (
    typeof result === "object" &&
    "verification_required" in result &&
    result.verification_required
  ) {
    try {
      await requestVerificationEmail(email, result.token)
    } catch {
      // Ignore: the customer can resend from the verification page.
    }
    return { state: "verification_required", email }
  }

  if (typeof result !== "string") {
    return {
      state: "error",
      error: "La connexion nécessite une étape supplémentaire qui n'est pas prise en charge.",
    }
  }

  let token = result

  // The token may not be tied to a customer record yet — right after
  // registration, or after verifying a brand-new account. Ask the backend:
  // `/store/customers/me` rejects tokens without a registered actor, so a
  // failed retrieve means we still need to create the customer, then log in
  // again to obtain a customer-bound token.
  const customerExists = await sdk.store.customer
    .retrieve({}, { authorization: `Bearer ${token}` })
    .then(() => true)
    .catch(() => false)

  if (!customerExists) {
    const pending = await getPendingCustomer()

    try {
      await sdk.store.customer.create(
        {
          email,
          first_name: pending?.first_name,
          last_name: pending?.last_name,
          phone: pending?.phone,
        },
        {},
        { authorization: `Bearer ${token}` }
      )

      token = (await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })) as string
    } catch (error) {
      return { state: "error", error: String(error) }
    }

    await removePendingCustomer()
  }

  await setAuthToken(token)

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  try {
    await transferCart()
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  return { state: "success" }
}

// Confirms a customer's email using the token from the verification link.
//
// The confirm route doesn't require authentication, so this works even when the
// customer opens the link on a different device than the one they signed up on.
export async function confirmEmailVerification(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sdk.auth.verification.confirm({ code: token })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Requests a password reset email for the given address. The native route
// responds identically whether or not an account exists for that address, so
// this never reveals which — the storefront must show the same message
// either way (spec §"Aucune énumération").
export async function requestPasswordReset(
  _currentState: unknown,
  formData: FormData
): Promise<ResetPasswordState> {
  const email = formData.get("email") as string

  try {
    await sdk.auth.resetPassword("customer", "emailpass", { identifier: email })
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  return { state: "success" }
}

// Sets a new password using the token from the reset-password email link.
// Authenticated by that one-time token alone, not by a session cookie, so
// this works logged out, on any device (spec §"Storefront — le mot de
// passe").
export async function resetPassword(
  _currentState: unknown,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = formData.get("token") as string
  const password = formData.get("password") as string

  try {
    await sdk.auth.updateProvider("customer", "emailpass", { password }, token)
  } catch {
    // The only realistic failure here is a false, expired, or already-used
    // token (native auth module) — a fixed, French message beats surfacing
    // the backend's raw "Invalid token" (AC: "un message compréhensible, pas
    // une erreur brute").
    return {
      state: "error",
      error:
        "Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau.",
    }
  }

  return { state: "success" }
}

// Changes the password of the logged-in customer, authenticated by their
// session — unlike resetPassword/updateProvider above, no token from an
// email is involved (spec §"Storefront — le mot de passe": "Il ne partage
// rien avec le ticket 04 [...] ici, c'est la session").
//
// Goes through a custom store route, not the native
// `/auth/customer/emailpass/update`: that native route only accepts a
// reset-purpose token (Medusa 2.16.0 hardened it to reject plain session
// bearer tokens), and the only native way to mint one delivers it
// exclusively by email — which this flow must not send. See
// `apps/backend/src/workflows/customer/change-password.ts` for the backend
// side, including the old-password check.
export const updateCustomerPassword = async (
  _currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const oldPassword = formData.get("old_password") as string
  const newPassword = formData.get("new_password") as string
  const confirmPassword = formData.get("confirm_password") as string

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: "Le nouveau mot de passe et sa confirmation ne correspondent pas.",
    }
  }

  const headers = await getAuthHeaders()

  try {
    await sdk.client.fetch(`/store/customers/me/password`, {
      method: "POST",
      body: { old_password: oldPassword, new_password: newPassword },
      headers,
    })
  } catch (error) {
    const fetchError = error as FetchError

    if (fetchError.statusText === "Unauthorized") {
      return { success: false, error: "L'ancien mot de passe est incorrect." }
    }

    return {
      success: false,
      error: "Une erreur est survenue, veuillez réessayer.",
    }
  }

  return { success: true, error: null }
}

// Signing out removes the identity, not the cart: the cart survives as a
// guest cart and stays orderable through checkout (spec §"la déconnexion
// garde le panier"). The cart id cookie is untouched — but the cart itself
// must still be detached from the customer first: a prior login pinned
// customer_id/email onto this exact cart (native transferCart), and nothing
// clears that on logout by default. Left alone, a guest checkout completed
// later on this same cart would still write onto the departed customer's
// account (see detach-cart-customer.ts on the backend). Best-effort: a
// failure here must never block the customer from logging out.
export async function signout(countryCode: string) {
  const cartId = await getCartId()

  if (cartId) {
    const headers = await getAuthHeaders()

    try {
      await sdk.client.fetch(`/store/customers/me/carts/${cartId}/customer`, {
        method: "DELETE",
        headers,
      })
    } catch {
      // Ignore: worst case the cart keeps a stale customer_id until it's
      // abandoned or replaced by a new one.
    }
  }

  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  redirect(`/${countryCode}/account`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  try {
    await sdk.store.cart.transferCart(cartId, {}, headers)
  } catch (error) {
    // A 401 here means the stored JWT is no longer accepted by the backend
    // (e.g. it expired) even though `retrieveCustomer()`'s cached result
    // still shows this customer as logged in — that cache is only
    // invalidated by an explicit login/logout, never by natural token
    // expiry. Left alone, the customer stays stuck looking "logged in"
    // while every authenticated action, including retrying this same
    // transfer from CartMismatchBanner, keeps failing the same way with no
    // path to recover. Clearing the dead token and revalidating the
    // customer cache here drops them back to a real "logged out" state,
    // where logging in again both fixes the token and re-runs this same
    // transfer through completeLogin().
    const fetchError = error as FetchError

    if (fetchError.statusText === "Unauthorized") {
      await removeAuthToken()

      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
    }

    throw error
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export type CreateAccountFromOrderState =
  | { state: "success" }
  | { state: "partial"; error: string; transferRequested: boolean }
  | { state: "error"; error: string; code?: "account_exists" }
  | null

const GENERIC_CREATE_ACCOUNT_ERROR: CreateAccountFromOrderState = {
  state: "error",
  error: "La création du compte a échoué. Vous pouvez réessayer.",
}

// Ticket 07 ("Créer son compte après le paiement"): the only account-creation
// path that starts from a paid, guest order rather than a blank form. The
// email, name, phone and billing address all come from the order already on
// screen — the customer only chooses a password. Deliberately not reusing
// `signup`/`completeLogin`: those are wired to FormData fields and the
// pending-customer cookie built for the anonymous registration form, whereas
// every field here is already known from `order`.
//
// ADR 0011 ("Why nothing is offered inside the checkout" /
// "Why the Adresse de facturation is written silently"): the address write
// happens here, directly from the order, rather than through ticket 03's
// `sync-billing-address-from-order` workflow — that workflow reacts to
// `order.placed` for an already-logged-in customer, which this guest order
// never was.
//
// Each step after registration builds on session state already committed
// (the customer is logged in as soon as the token is set), so a later
// failure — e.g. the address write — must not be presented as if nothing
// happened: it's reported as "partial", not "error" (spec: "ce qui a réussi
// reste acquis").
export async function createAccountFromOrder(
  order: HttpTypes.StoreOrder,
  _currentState: CreateAccountFromOrderState,
  formData: FormData
): Promise<CreateAccountFromOrderState> {
  const password = formData.get("password") as string
  const email = order.email
  const address = order.shipping_address

  if (!email) {
    return {
      state: "error",
      error: "Cette commande n'a pas d'adresse email : impossible de créer un compte.",
    }
  }

  try {
    await sdk.auth.register("customer", "emailpass", { email, password })
  } catch (error) {
    const fetchError = error as FetchError
    if (
      fetchError.statusText === "Unauthorized" &&
      fetchError.message === "Identity with email already exists"
    ) {
      return {
        state: "error",
        error:
          "Un compte existe déjà pour cet email. Connectez-vous pour retrouver vos informations.",
        code: "account_exists",
      }
    }
    return GENERIC_CREATE_ACCOUNT_ERROR
  }

  let token: string

  try {
    const result = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    })

    if (typeof result !== "string") {
      return GENERIC_CREATE_ACCOUNT_ERROR
    }

    token = result
  } catch {
    return GENERIC_CREATE_ACCOUNT_ERROR
  }

  try {
    await sdk.store.customer.create(
      {
        email,
        first_name: address?.first_name ?? undefined,
        last_name: address?.last_name ?? undefined,
        phone: address?.phone ?? undefined,
      },
      {},
      { authorization: `Bearer ${token}` }
    )

    // The registration token isn't bound to the new customer record yet
    // (same reconciliation as `completeLogin`) — logging in again exchanges
    // it for one that is.
    token = (await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    })) as string
  } catch {
    return GENERIC_CREATE_ACCOUNT_ERROR
  }

  // The account exists and this token proves it — persist the session before
  // attempting the address write, so a failure past this point never costs
  // the login the customer already earned.
  await setAuthToken(token)
  revalidateTag(await getCacheTag("customers"))

  // Ticket 07 and 08 are two independent functions of the account (spec:
  // "les deux fonctions du Compte doivent tomber en panne indépendamment"),
  // so a failure on one never skips the other: both are always attempted.
  let addressWarning: string | null = null

  if (address) {
    try {
      await sdk.store.customer.createAddress(
        {
          first_name: address.first_name ?? undefined,
          last_name: address.last_name ?? undefined,
          company: address.company ?? undefined,
          address_1: address.address_1 ?? undefined,
          address_2: address.address_2 ?? undefined,
          city: address.city ?? undefined,
          province: address.province ?? undefined,
          postal_code: address.postal_code ?? undefined,
          country_code: address.country_code ?? undefined,
          phone: address.phone ?? undefined,
          is_default_billing: true,
        },
        {},
        { authorization: `Bearer ${token}` }
      )
      revalidateTag(await getCacheTag("customers"))
    } catch {
      addressWarning =
        "votre adresse n'a pas pu être enregistrée : vous pourrez l'ajouter depuis votre profil"
    }
  }

  // Ticket 08 ("Rattacher la première commande"): the order that just paid
  // was placed as a guest and belongs to no one yet. Requesting its transfer
  // here is what triggers the rattachement email (ADR 0011) — without this
  // call the mechanism built in ticket 06 has nothing to react to. Failure
  // here costs only the order history, never the account or address already
  // acquired above.
  let transferRequested = true

  try {
    await sdk.store.order.requestTransfer(
      order.id,
      {},
      { fields: "id" },
      { authorization: `Bearer ${token}` }
    )
  } catch {
    transferRequested = false
  }

  if (!transferRequested) {
    const transferWarning =
      "la demande pour retrouver cette commande dans votre historique n'a pas pu être envoyée : vous pouvez réessayer depuis la page « Commandes », avec le numéro de commande"
    return {
      state: "partial",
      error: addressWarning
        ? `Votre compte est créé et vous êtes connecté, mais ${addressWarning}, et ${transferWarning}.`
        : `Votre compte est créé et vous êtes connecté, mais ${transferWarning}.`,
      transferRequested: false,
    }
  }

  if (addressWarning) {
    return {
      state: "partial",
      error: `Votre compte est créé et vous êtes connecté, mais ${addressWarning}.`,
      transferRequested: true,
    }
  }

  return { state: "success" }
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "L'identifiant de l'adresse est requis" }
  }

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
