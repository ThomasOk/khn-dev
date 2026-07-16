import FormuleModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const FORMULE_MODULE = "formule"

export default Module(FORMULE_MODULE, {
  service: FormuleModuleService,
})
