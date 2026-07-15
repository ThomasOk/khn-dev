import { defineMiddlewares } from "@medusajs/framework/http"
import { pickupAdminMiddlewares } from "./admin/pickup/middlewares"

export default defineMiddlewares({
  routes: [...pickupAdminMiddlewares],
})
