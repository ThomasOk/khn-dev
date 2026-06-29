import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Image
        src="/images/restaurant_hero.png"
        alt="Kim-Hi Noodle - le restaurant"
        fill
        className="object-cover object-center"
        priority
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="absolute bottom-10 left-8 small:left-16 z-10 flex flex-col gap-6">
        <h1 className="text-4xl small:text-6xl font-bold text-white uppercase leading-tight max-w-xl">
          De multiples façons de déguster les nouilles.
        </h1>
        <LocalizedClientLink
          href="/store"
          className="self-start inline-flex items-center px-6 py-3 border border-white text-white text-sm font-medium transition-colors duration-200 [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-neutral-900"
        >
          Voir la carte
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
