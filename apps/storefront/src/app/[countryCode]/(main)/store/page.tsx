import { Metadata } from "next"

import { listCategories } from "@lib/data/categories"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "La carte",
  description: "Découvrez notre carte de plats.",
}

type Params = {
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const categories = await listCategories()

  return (
    <StoreTemplate countryCode={params.countryCode} categories={categories} />
  )
}
