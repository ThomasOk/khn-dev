import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

const ReservationCtaSection = () => {
  return (
    <section className="relative w-full overflow-hidden">
      <Image
        src="/images/reservation-tables.png"
        alt=""
        aria-hidden="true"
        fill
        className="object-cover"
      />

      <div className="absolute inset-0 bg-khn-cream/95" />

      <div className="relative z-10 content-container py-20 small:py-28">
        <RevealWrapper direction="up">
          <div className="flex flex-col items-center text-center gap-5">
            <Image
              src="/images/khn-swirl-mark.png"
              alt=""
              aria-hidden="true"
              width={122}
              height={117}
              className="h-10 w-auto small:h-12 opacity-80"
            />

            <p className="text-khn-gold text-sm font-medium uppercase tracking-widest">
              Prendre place chez nous
            </p>

            <h2 className="font-display text-4xl small:text-5xl leading-tight text-stone-900 max-w-2xl">
              Réservez votre table
              <br />
              en quelques clics
            </h2>

            <span className="h-0.5 w-14 bg-khn-gold" />

            <p className="text-stone-600 text-base max-w-md [text-wrap:balance]">
              Profitez d&apos;un moment gourmand dans une ambiance
              chaleureuse, préparé avec soin pour chacun de vos instants.
            </p>

            <div className="flex flex-col xsmall:flex-row items-center gap-4 mt-2">
              <LocalizedClientLink
                href="/table-reservations"
                className="inline-flex items-center justify-center min-w-[220px] px-8 py-4 bg-khn-teal text-white text-xs font-semibold tracking-[0.15em] uppercase transition-colors duration-200 [@media(hover:hover)]:hover:bg-khn-teal-panel"
              >
                Réserver une table
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center justify-center min-w-[220px] px-8 py-4 border border-khn-teal text-khn-teal text-xs font-semibold tracking-[0.15em] uppercase transition-colors duration-200 [@media(hover:hover)]:hover:bg-khn-teal [@media(hover:hover)]:hover:text-white"
              >
                Commander en ligne
              </LocalizedClientLink>
            </div>

            <div className="w-full max-w-md border-t border-stone-300/60 mt-10 pt-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 px-8 border-r border-stone-300/60">
                <p className="text-stone-400 text-xs uppercase tracking-widest">
                  Par téléphone
                </p>
                <a
                  href="tel:0973896013"
                  className="font-semibold text-khn-teal transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
                >
                  09 73 89 60 13
                </a>
              </div>
              <div className="flex flex-col items-center gap-1 px-8">
                <p className="text-stone-400 text-xs uppercase tracking-widest">
                  Par email
                </p>
                <a
                  href="mailto:contact@kim-hi-noodle.fr"
                  className="font-semibold text-khn-teal transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
                >
                  contact@kim-hi-noodle.fr
                </a>
              </div>
            </div>
          </div>
        </RevealWrapper>
      </div>
    </section>
  )
}

export default ReservationCtaSection
