import { Metadata } from "next"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

export const metadata: Metadata = {
  title: "Contact & Informations — Kim-Hi Noodle",
  description:
    "Horaires, adresse, transport et informations pratiques du restaurant Kim-Hi Noodle à Castelnau-le-Lez.",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen">

      {/* Header — fond sombre, clearance pour la nav fixe */}
      <div className="bg-stone-900 pt-32 pb-20 small:pt-40 small:pb-28">
        <div className="content-container flex flex-col items-center text-center gap-4">
          <p className="text-orange-500 text-sm font-medium uppercase tracking-widest">
            Kim-Hi Noodle
          </p>
          <h1 className="font-display text-4xl small:text-6xl text-white leading-tight">
            Contact & Informations
          </h1>
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-khn-cream py-20 small:py-28">
        <div className="content-container">
          <div className="grid grid-cols-1 small:grid-cols-2 gap-16 small:gap-20 items-start">

            {/* Colonne info */}
            <div className="flex flex-col gap-12">

              {/* Horaires */}
              <RevealWrapper direction="left">
                <div className="flex flex-col gap-5">
                  <p className="text-stone-900 font-semibold text-xs uppercase tracking-widest pb-3 border-b border-stone-200">
                    Horaires
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                      <p className="text-orange-600 text-xs font-semibold uppercase tracking-wider">
                        Sur Place
                      </p>
                      <div className="flex flex-col gap-2 text-sm text-stone-600">
                        <div>
                          <p className="font-medium text-stone-800">Lun – Jeu</p>
                          <p>11h30 – 14h00</p>
                          <p>18h30 – 21h30</p>
                        </div>
                        <div>
                          <p className="font-medium text-stone-800">Ven – Sam</p>
                          <p>11h30 – 14h00</p>
                          <p>18h30 – 22h00</p>
                        </div>
                        <p className="text-stone-400">Dimanche fermé</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <p className="text-orange-600 text-xs font-semibold uppercase tracking-wider">
                        À Emporter
                      </p>
                      <div className="flex flex-col gap-2 text-sm text-stone-600">
                        <div>
                          <p className="font-medium text-stone-800">Lun – Jeu</p>
                          <p>11h00 – 14h00</p>
                          <p>18h00 – 22h00</p>
                        </div>
                        <div>
                          <p className="font-medium text-stone-800">Ven – Sam</p>
                          <p>11h00 – 14h00</p>
                          <p>18h00 – 22h30</p>
                        </div>
                        <p className="text-stone-400">Dimanche fermé</p>
                      </div>
                    </div>
                  </div>
                </div>
              </RevealWrapper>

              {/* Nous trouver */}
              <RevealWrapper direction="left" delay={80}>
                <div className="flex flex-col gap-5">
                  <p className="text-stone-900 font-semibold text-xs uppercase tracking-widest pb-3 border-b border-stone-200">
                    Nous trouver
                  </p>
                  <div className="flex flex-col gap-4 text-sm text-stone-600">
                    <div>
                      <p className="font-medium text-stone-800">Adresse</p>
                      <p>652 Avenue de l&apos;Europe</p>
                      <p>34170 Castelnau-le-Lez</p>
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">Transports en commun</p>
                      <p>Tramway Ligne 2 — Arrêt Clairval</p>
                      <p className="text-stone-400">À 2 minutes à pied</p>
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">Parking</p>
                      <p>City Stade — 240 Rue des Anémones</p>
                      <p className="text-stone-400">À 4 minutes à pied</p>
                    </div>
                  </div>
                </div>
              </RevealWrapper>

              {/* Contact */}
              <RevealWrapper direction="left" delay={160}>
                <div className="flex flex-col gap-5">
                  <p className="text-stone-900 font-semibold text-xs uppercase tracking-widest pb-3 border-b border-stone-200">
                    Nous contacter
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href="tel:0973896013"
                      className="text-sm text-stone-600 transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-600"
                    >
                      09 73 89 60 13
                    </a>
                    <a
                      href="mailto:contact@kim-hi-noodle.fr"
                      className="text-sm text-stone-600 transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-600"
                    >
                      contact@kim-hi-noodle.fr
                    </a>
                  </div>
                </div>
              </RevealWrapper>

              {/* À savoir */}
              <RevealWrapper direction="left" delay={240}>
                <div className="flex flex-col gap-5">
                  <p className="text-stone-900 font-semibold text-xs uppercase tracking-widest pb-3 border-b border-stone-200">
                    À savoir
                  </p>
                  <div className="flex flex-col gap-4 text-sm text-stone-600">
                    <div>
                      <p className="font-medium text-stone-800">Modes de commande</p>
                      <p>Sur place · Uber Eats · Deliveroo · À emporter</p>
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">Moyens de paiement</p>
                      <p>Espèces, Visa, CB MasterCard, Ticket Restaurant</p>
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">Animaux</p>
                      <p>Animaux domestiques non admis.</p>
                      <p className="text-stone-400">
                        Exception : chiens guides ou d&apos;assistance, selon la loi en vigueur.
                      </p>
                    </div>
                  </div>
                </div>
              </RevealWrapper>

            </div>

            {/* Colonne carte */}
            <RevealWrapper direction="right" delay={100}>
              <div className="flex flex-col gap-4 small:sticky small:top-24">
                <div className="w-full aspect-[4/3] overflow-hidden">
                  {/*
                    Pour une carte plus précise :
                    1. Ouvrir Google Maps sur l'adresse du restaurant
                    2. Cliquer "Partager" → "Intégrer une carte"
                    3. Copier l'URL du src et remplacer celle-ci
                  */}
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
                <a
                  href="https://maps.google.com/maps?q=652+Avenue+de+l%27Europe%2C+34170+Castelnau-le-Lez"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 border border-stone-300 text-stone-700 text-sm font-medium transition-colors duration-200 [@media(hover:hover)]:hover:border-stone-900 [@media(hover:hover)]:hover:text-stone-900"
                >
                  Ouvrir dans Google Maps
                </a>
              </div>
            </RevealWrapper>

          </div>
        </div>
      </div>

    </div>
  )
}
