import { defineMiddlewares } from "@medusajs/framework/http"
import { pickupAdminMiddlewares } from "./admin/pickup/middlewares"
import { formuleAdminMiddlewares } from "./admin/formules/middlewares"
import { tableReservationAdminMiddlewares } from "./admin/table-reservation/middlewares"
import { tableReservationStoreMiddlewares } from "./store/table-reservations/middlewares"

export default defineMiddlewares({
  routes: [
    ...pickupAdminMiddlewares,
    ...formuleAdminMiddlewares,
    ...tableReservationAdminMiddlewares,
    ...tableReservationStoreMiddlewares,
  ],
})
