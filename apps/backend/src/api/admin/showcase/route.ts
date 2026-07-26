import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHOWCASE_MODULE } from "../../../modules/showcase"
import ShowcaseModuleService from "../../../modules/showcase/service"
import { upsertShowcaseConfigWorkflow } from "../../../workflows/showcase/upsert-config"
import { UpsertShowcaseConfigSchema } from "./middlewares"

// GET /admin/showcase — the current Mode vitrine state, or the "off, no
// note" default before it has ever been written. The absence of a row means
// mode off, empty note; this read never creates one.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ShowcaseModuleService = req.scope.resolve(SHOWCASE_MODULE)

  const [config] = await service.listShowcaseConfigs()

  res.json({
    enabled: config?.enabled ?? false,
    note: config?.note ?? null,
  })
}

// POST /admin/showcase — upsert both fields. There is only ever one row, and
// no DELETE: the state always exists, it is false by default.
export async function POST(
  req: MedusaRequest<UpsertShowcaseConfigSchema>,
  res: MedusaResponse
) {
  const { result } = await upsertShowcaseConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ enabled: result.enabled, note: result.note })
}
