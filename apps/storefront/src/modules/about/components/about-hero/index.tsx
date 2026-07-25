import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const AboutHero = () => {
  return (
    <div className="relative w-full overflow-hidden">
      <Image
        src="/images/background_about.webp"
        alt="Salle du restaurant Kim-Hi Noodle"
        fill
        className="object-cover"
        priority
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 content-container flex flex-col items-center text-center gap-5 pt-32 pb-20 small:pt-40 small:pb-28">
        <Image
          src="/images/khn-swirl-mark.png"
          alt=""
          aria-hidden="true"
          width={122}
          height={117}
          className="h-10 w-auto small:h-12 opacity-90"
        />

        <h1
          className="font-display text-4xl small:text-6xl uppercase tracking-wide leading-tight text-white"
          data-testid="about-page-title"
        >
          Notre histoire
        </h1>

        <span className="h-0.5 w-14 bg-khn-gold" />

        <p className="text-sm small:text-base text-white/80 max-w-md [text-wrap:balance]">
          Depuis nos débuts, nous partageons l&apos;authenticité de la
          cuisine asiatique à travers des recettes transmises et revisitées
          avec passion.
        </p>

        <LocalizedClientLink
          href="/store"
          className="mt-4 inline-flex items-center px-8 py-4 border border-white text-white text-xs tracking-[0.15em] uppercase transition-[background-color,color,transform] duration-200 motion-safe:active:scale-[0.97] [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-neutral-900"
        >
          Voir la carte
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default AboutHero
