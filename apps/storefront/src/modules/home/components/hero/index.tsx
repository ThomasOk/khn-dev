import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Image
        src="/images/pad_thai.webp"
        alt="Pad thai - Kim-Hi Noodle"
        fill
        className="object-cover object-[50%_68%]"
        priority
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex items-center gap-4 text-white/80">
          <span className="h-px w-10 bg-white/50" />
          <span className="text-xs tracking-[0.3em] uppercase">
            Savourez chaque bouchée
          </span>
          <span className="h-px w-10 bg-white/50" />
        </div>

        <h1 className="font-display text-4xl small:text-6xl leading-tight text-white max-w-3xl">
          <span className="font-bold">De multiples façons de</span>
          <br />
          <span className="italic font-normal">déguster les nouilles</span>
        </h1>

        <div className="flex items-center gap-4 mt-2">
          <LocalizedClientLink
            href="/table-reservations"
            className="inline-flex items-center px-6 py-3 border border-white text-white text-xs tracking-[0.15em] uppercase transition-[background-color,color,transform] duration-200 motion-safe:active:scale-[0.97] [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-neutral-900"
          >
            Réserver une table
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center px-6 py-3 bg-white text-neutral-900 text-xs tracking-[0.15em] uppercase transition-[background-color,transform] duration-200 motion-safe:active:scale-[0.97] [@media(hover:hover)]:hover:bg-orange-300"
          >
            Commander
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default Hero
