import Image from "next/image"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

const ReservationSection = () => {
  return (
    <section className="bg-khn-cream overflow-x-hidden">
      <div className="content-container">

        {/* Zone 1 — Header centré */}
        <div className="pt-20 small:pt-28 pb-16 small:pb-20 flex flex-col items-center text-center gap-8">

          <RevealWrapper direction="up">
            <h2 className="font-display uppercase tracking-wide text-5xl small:text-6xl leading-[1.1] text-stone-900 [text-wrap:balance] max-w-3xl">
              Réservez votre table chez nous
            </h2>
          </RevealWrapper>

          <RevealWrapper direction="up" delay={80}>
            <p className="text-sm text-stone-600 leading-relaxed max-w-md [text-wrap:balance]">
              Un repas en famille, un déjeuner entre collègues, une pause gourmande au cœur du Cambodge.
            </p>
          </RevealWrapper>

          <RevealWrapper direction="up" delay={160}>
            <a
              href="tel:0973896013"
              className="inline-flex items-center justify-center min-h-[44px] px-10 py-3 bg-stone-900 text-white text-sm font-medium uppercase tracking-widest transition-colors duration-200 active:scale-[0.97] [@media(hover:hover)]:hover:bg-stone-700"
            >
              Réservez une table
            </a>
          </RevealWrapper>

        </div>

        <hr className="border-stone-200" />

        {/* Zone 2 — Triptyque */}
        {/* DOM : image en premier → mobile = image au-dessus */}
        {/* Desktop : small:order-* → visual = Horaires | Image | Trouver */}
        <div className="flex flex-col small:flex-row small:justify-evenly small:items-stretch pb-20 small:pb-28 small:-mx-6">

          {/* IMAGE — DOM 1, visual 2 */}
          <RevealWrapper direction="up" delay={80} className="small:order-2 small:w-1/3">
            <div className="relative aspect-[3/2] small:aspect-auto small:h-full overflow-hidden">
              <Image
                src="/images/reservation-tables.png"
                alt="Salle du restaurant Kim-Hi Noodle"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
            </div>
          </RevealWrapper>

          {/* HORAIRES — DOM 2, visual 1 */}
          <RevealWrapper direction="left" className="small:order-1 small:w-[27%]">
            <div className="flex flex-col gap-6 py-10 small:py-16 small:px-16">

              <p className="text-xs font-semibold uppercase tracking-widest text-stone-900 pb-3 border-b border-stone-200">
                Horaires d&apos;ouverture
              </p>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Sur Place
                  </p>
                  <div className="text-sm text-stone-600 leading-relaxed">
                    <p className="font-medium text-stone-800">Lundi au Jeudi</p>
                    <p>11h30 – 14h00</p>
                    <p>18h30 – 21h30</p>
                    <p className="font-medium text-stone-800 mt-3">Vendredi et Samedi</p>
                    <p>11h30 – 14h00</p>
                    <p>18h30 – 22h00</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    À Emporter
                  </p>
                  <div className="text-sm text-stone-600 leading-relaxed">
                    <p className="font-medium text-stone-800">Lundi - Jeudi</p>
                    <p>11h00 – 14h00</p>
                    <p>18h00 – 22h00</p>
                    <p className="font-medium text-stone-800 mt-3">Vendredi - Samedi</p>
                    <p>11h00 – 14h00</p>
                    <p>18h00 – 22h30</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-400 uppercase tracking-wider">
                Dimanche fermé
              </p>

            </div>
          </RevealWrapper>

          {/* OÙ NOUS TROUVER — DOM 3, visual 3 */}
          <RevealWrapper direction="right" delay={160} className="small:order-3 small:w-[27%]">
            <div className="flex flex-col gap-6 py-10 small:py-16 small:px-16">

              <p className="text-xs font-semibold uppercase tracking-widest text-stone-900 pb-3 border-b border-stone-200">
                Où nous trouver
              </p>

              <div className="flex flex-col gap-6">

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Adresse
                  </p>
                  <p className="text-sm text-stone-600">652 Avenue de l&apos;Europe</p>
                  <p className="text-sm text-stone-600">34170 Castelnau-le-Lez</p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Contact
                  </p>
                  <a
                    href="tel:0973896013"
                    className="text-sm text-stone-600 transition-colors duration-200 [@media(hover:hover)]:hover:text-stone-900"
                  >
                    09 73 89 60 13
                  </a>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Réseaux sociaux
                  </p>
                  <div className="flex gap-3">
                    <a
                      href="https://facebook.com/kimhinoodle"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-stone-300 text-stone-600 transition-colors duration-200 [@media(hover:hover)]:hover:border-stone-900 [@media(hover:hover)]:hover:text-stone-900"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    </a>
                    <a
                      href="https://instagram.com/kimhinoodle"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-stone-300 text-stone-600 transition-colors duration-200 [@media(hover:hover)]:hover:border-stone-900 [@media(hover:hover)]:hover:text-stone-900"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </RevealWrapper>

        </div>
      </div>
    </section>
  )
}

export default ReservationSection
