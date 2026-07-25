import {
  Buildings,
  CreditCard,
  Directions,
  InformationCircle,
  MapPin,
} from "@medusajs/icons"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

type InfoItem = {
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const infoItems: InfoItem[] = [
  {
    icon: MapPin,
    label: "Tramway Ligne 2 — Arrêt Clairval, à 2 minutes à pied",
  },
  {
    icon: Buildings,
    label: "Parking City Stade — 240 Rue des Anémones, à 4 minutes à pied",
  },
  {
    icon: CreditCard,
    label: "Espèces, Visa, CB MasterCard, Ticket Restaurant",
  },
  {
    icon: InformationCircle,
    label:
      "Animaux domestiques non admis, sauf chiens guides ou d'assistance",
  },
]

const FindUsSection = () => {
  return (
    <section className="bg-khn-cream py-20 small:py-28">
      <div className="content-container">
        <RevealWrapper direction="up">
          <div className="flex flex-col items-center text-center gap-5 mb-16 small:mb-20">
            <p className="text-khn-gold text-sm font-medium uppercase tracking-widest">
              Comment nous rejoindre
            </p>

            <h2 className="font-display text-4xl small:text-5xl leading-tight text-stone-900">
              Nous Trouver
            </h2>

            <span className="h-0.5 w-14 bg-khn-gold" />
          </div>
        </RevealWrapper>

        <div className="grid grid-cols-1 small:grid-cols-[1.6fr_1fr] gap-10 small:gap-12 items-start">
          <RevealWrapper direction="left">
            <div className="w-full aspect-[5/3] overflow-hidden rounded-lg">
              <iframe
                src="https://maps.google.com/maps?q=652+Avenue+de+l%27Europe%2C+34170+Castelnau-le-Lez&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Kim-Hi Noodle — 652 Avenue de l'Europe, 34170 Castelnau-le-Lez"
                allowFullScreen
              />
            </div>
          </RevealWrapper>

          <RevealWrapper direction="right" delay={150}>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6 rounded-lg bg-stone-900 p-8">
                <div className="flex flex-col gap-3">
                  <p className="text-khn-gold text-xs font-semibold uppercase tracking-widest">
                    Adresse
                  </p>
                  <p className="font-display text-xl text-white leading-snug">
                    652 Avenue de l&apos;Europe
                    <br />
                    34170 Castelnau-le-Lez
                  </p>
                </div>

                <a
                  href="https://maps.google.com/maps?q=652+Avenue+de+l%27Europe%2C+34170+Castelnau-le-Lez"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-khn-gold text-stone-900 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 [@media(hover:hover)]:hover:bg-khn-gold/90"
                >
                  <Directions className="h-4 w-4" />
                  Obtenir l&apos;itinéraire
                </a>
              </div>

              <div className="flex flex-col">
                {infoItems.map((item, index) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-4 py-4 ${
                        index > 0 ? "border-t border-stone-200" : "pt-0"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-khn-cream-hover">
                        <Icon className="h-4 w-4 text-khn-teal" />
                      </div>
                      <p className="text-stone-700 text-sm">{item.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  )
}

export default FindUsSection
