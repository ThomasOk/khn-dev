import { defineMiddlewares } from "@medusajs/framework/http"
import { pickupAdminMiddlewares } from "./admin/pickup/middlewares"
import { formuleAdminMiddlewares } from "./admin/formules/middlewares"

export default defineMiddlewares({
  routes: [...pickupAdminMiddlewares, ...formuleAdminMiddlewares],
})
