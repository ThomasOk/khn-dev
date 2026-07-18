import TableReservationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const TABLE_RESERVATION_MODULE = "table_reservation"

export default Module(TABLE_RESERVATION_MODULE, {
  service: TableReservationModuleService,
})
