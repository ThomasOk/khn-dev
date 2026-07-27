import { defineMiddlewares } from "@medusajs/framework/http"
import { pickupAdminMiddlewares } from "./admin/pickup/middlewares"
import { formuleAdminMiddlewares } from "./admin/formules/middlewares"
import { tableReservationAdminMiddlewares } from "./admin/table-reservation/middlewares"
import { tableReservationStoreMiddlewares } from "./store/table-reservations/middlewares"
import { announcementAdminMiddlewares } from "./admin/announcements/middlewares"
import { showcaseAdminMiddlewares } from "./admin/showcase/middlewares"
import { customerPasswordStoreMiddlewares } from "./store/customers/me/password/middlewares"

export default defineMiddlewares({
  routes: [
    ...pickupAdminMiddlewares,
    ...formuleAdminMiddlewares,
    ...tableReservationAdminMiddlewares,
    ...tableReservationStoreMiddlewares,
    ...announcementAdminMiddlewares,
    ...showcaseAdminMiddlewares,
    ...customerPasswordStoreMiddlewares,
  ],
})
