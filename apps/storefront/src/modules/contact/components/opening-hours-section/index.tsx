"use client"

import { useState } from "react"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

type ScheduleRow = {
  day: string
  lunch: string | null
  dinner: string | null
}

type ServiceType = "sur-place" | "a-emporter"

const schedules: Record<ServiceType, ScheduleRow[]> = {
  "sur-place": [
    { day: "Lundi – Jeudi", lunch: "11h30 – 14h00", dinner: "18h30 – 21h30" },
    { day: "Vendredi & Samedi", lunch: "11h30 – 14h00", dinner: "18h30 – 22h00" },
    { day: "Dimanche", lunch: null, dinner: null },
  ],
  "a-emporter": [
    { day: "Lundi – Jeudi", lunch: "11h00 – 14h00", dinner: "18h00 – 22h00" },
    { day: "Vendredi & Samedi", lunch: "11h00 – 14h00", dinner: "18h00 – 22h30" },
    { day: "Dimanche", lunch: null, dinner: null },
  ],
}

const tabs: { key: ServiceType; label: string }[] = [
  { key: "sur-place", label: "Sur place" },
  { key: "a-emporter", label: "À emporter" },
]

const OpeningHoursSection = () => {
  const [activeTab, setActiveTab] = useState<ServiceType>("sur-place")

  return (
    <section className="bg-khn-teal py-20 small:py-28">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-2 gap-16 small:gap-20 items-start">
          <RevealWrapper direction="left">
            <div className="flex flex-col gap-6">
              <p className="text-khn-gold text-sm font-medium uppercase tracking-widest">
                Quand nous rendre visite
              </p>

              <h2 className="font-display text-4xl small:text-5xl leading-tight text-white">
                Horaires
                <br />
                d&apos;Ouverture
              </h2>

              <span className="h-0.5 w-14 bg-khn-gold" />

              <p className="text-white/70 text-base leading-relaxed max-w-sm">
                Nous vous accueillons avec plaisir du lundi au samedi. Venez
                partager un moment convivial dans notre salle chaleureuse.
              </p>
            </div>
          </RevealWrapper>

          <RevealWrapper direction="right" delay={150}>
            <div className="flex flex-col gap-10">
              <div className="flex items-center gap-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center px-6 py-2.5 rounded-full text-xs font-medium uppercase tracking-wide transition-colors duration-200 ${
                      activeTab === tab.key
                        ? "bg-khn-gold text-stone-900"
                        : "bg-white/10 text-white/70 [@media(hover:hover)]:hover:bg-white/15"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col">
                {schedules[activeTab].map((row, index) => {
                  const isOpen = row.lunch !== null

                  return (
                    <div
                      key={row.day}
                      className={`flex items-center justify-between gap-6 py-6 ${
                        index > 0 ? "border-t border-white/10" : "pt-0"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isOpen ? "bg-khn-gold" : "bg-white/30"
                          }`}
                        />
                        <p className="font-display text-xl text-white">
                          {row.day}
                        </p>
                      </div>

                      {isOpen ? (
                        <div className="flex items-center gap-6 small:gap-10">
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-khn-gold text-[11px] font-semibold uppercase tracking-wider">
                              Déjeuner
                            </p>
                            <p className="text-white text-sm small:text-base">
                              {row.lunch}
                            </p>
                          </div>
                          <span className="h-8 w-px bg-white/15" />
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-khn-gold text-[11px] font-semibold uppercase tracking-wider">
                              Dîner
                            </p>
                            <p className="text-white text-sm small:text-base">
                              {row.dinner}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-white/50 text-xs font-medium uppercase tracking-widest">
                          Fermé
                        </p>
                      )}
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

export default OpeningHoursSection
