import Image from "next/image"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

type Pillar = {
  number: string
  title: string
  description: string
}

const pillars: Pillar[] = [
  {
    number: "01",
    title: "Travail artisanal",
    description:
      "Nos nouilles sont préparées à la main selon des méthodes traditionnelles. Chaque détail compte, chaque geste est pensé pour offrir le meilleur.",
  },
  {
    number: "02",
    title: "Préparation minute",
    description:
      "Tout est cuisiné à la commande, dans le respect des textures et des saveurs. Rien n'est précuit, tout est frais, tout est vivant.",
  },
  {
    number: "03",
    title: "Traditions asiatiques",
    description:
      "Nos recettes s'inspirent des grands piliers de la cuisine asiatique : Cambodge, Vietnam, Thaïlande, Chine — un voyage culinaire authentique.",
  },
]

const CraftSection = () => {
  return (
    <section className="bg-stone-950 py-20 small:py-28">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-2 gap-16 small:gap-20 items-center">
          <RevealWrapper direction="left">
            <div className="relative">
              <div className="relative aspect-square w-full overflow-hidden">
                <Image
                  src="/images/cut_about.webp"
                  alt="Découpe minutieuse de la viande en cuisine"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>

              <div className="absolute -bottom-8 right-0 small:-right-10 max-w-[280px] bg-khn-teal-panel p-6 small:p-8">
                <p className="font-display italic text-lg small:text-xl text-white leading-snug">
                  « Vivez d&apos;amour et de nouilles fraiches. »
                </p>
                <span className="mt-4 block h-0.5 w-10 bg-khn-gold" />
              </div>
            </div>
          </RevealWrapper>

          <RevealWrapper direction="right" delay={150}>
            <div className="flex flex-col gap-6 small:pl-8">
              <p className="text-khn-gold text-sm font-medium uppercase tracking-widest">
                Notre savoir-faire
              </p>

              <h2 className="font-display uppercase text-4xl small:text-5xl leading-tight text-white">
                Un art culinaire
                <br />
                transmis avec soin
              </h2>

              <span className="h-0.5 w-14 bg-khn-gold" />

              <div className="flex flex-col gap-8 mt-2">
                {pillars.map((pillar) => (
                  <div key={pillar.number} className="flex gap-5">
                    <span className="font-display text-4xl text-khn-gold shrink-0 leading-none">
                      {pillar.number}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-white text-sm small:text-base font-semibold uppercase tracking-wide">
                        {pillar.title}
                      </h3>
                      <p className="text-stone-400 text-sm small:text-base leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  )
}

export default CraftSection
