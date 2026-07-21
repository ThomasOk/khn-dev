import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import StorySection from "@modules/home/components/story-section"
import DishOfMoment from "@modules/home/components/dish-of-moment"
import PopularProducts from "@modules/home/components/popular-products"
import ReservationSection from "@modules/home/components/reservation-section"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Medusa Next.js Starter Template",
  description:
    "A performant frontend ecommerce starter template with Next.js 15 and Medusa.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  return (
    <>
      <Hero />
      <StorySection />
      <DishOfMoment region={region} />
      <PopularProducts />
      <ReservationSection />
    </>
  )
}
