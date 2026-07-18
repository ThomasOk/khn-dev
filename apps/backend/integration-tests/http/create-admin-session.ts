import { Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"

// Bootstraps a real admin session the same way the `medusa user` CLI does
// under the hood: register the auth identity through the actual HTTP route
// (so the password is hashed by the emailpass provider, exactly as in
// production), attach a User to it, then log in for a bearer token. Admin
// route tests need this to exercise the real `authenticate` middleware
// rather than stubbing req.auth_context.
export async function createAdminSession(
  api: { post: (path: string, body?: unknown) => Promise<{ data: any }> },
  container: MedusaContainer,
  email: string,
  password: string
) {
  await api.post("/auth/user/emailpass/register", { email, password })

  const authModuleService = container.resolve(Modules.AUTH) as any
  const [authIdentity] = await authModuleService.listAuthIdentities({
    provider_identities: { entity_id: email },
  })

  await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId: authIdentity.id,
      userData: { email },
    },
  })

  const { data: loginData } = await api.post("/auth/user/emailpass", {
    email,
    password,
  })

  return { headers: { authorization: `Bearer ${loginData.token}` } }
}
