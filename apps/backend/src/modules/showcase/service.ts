import { MedusaService } from "@medusajs/framework/utils"
import ShowcaseConfig from "./models/showcase-config"

class ShowcaseModuleService extends MedusaService({
  ShowcaseConfig,
}) {}

export default ShowcaseModuleService
