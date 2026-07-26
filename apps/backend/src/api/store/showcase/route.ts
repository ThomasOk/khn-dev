import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHOWCASE_MODULE } from "../../../modules/showcase"
import ShowcaseModuleService from "../../../modules/showcase/service"

// GET /store/showcase — { showcase_mode, note }. The absence of a row means
// mode off, empty note. When showcase_mode is false, note is ALWAYS null on
// the wire, even if one is stored: a Note de vitrine prepared in advance is
// not published content (same principle as /store/announcement, which does
// not carry its dates).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ShowcaseModuleService = req.scope.resolve(SHOWCASE_MODULE)

  const [config] = await service.listShowcaseConfigs()
  const enabled = config?.enabled ?? false

  res.json({
    showcase_mode: enabled,
    note: enabled ? config?.note ?? null : null,
  })
}
