import ShowcaseModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SHOWCASE_MODULE = "showcase"

export default Module(SHOWCASE_MODULE, {
  service: ShowcaseModuleService,
})
