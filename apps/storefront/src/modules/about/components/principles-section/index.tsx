import { CheckCircle, Clock, Users } from "@medusajs/icons"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

type Principle = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const principles: Principle[] = [
  {
    icon: CheckCircle,
    title: "Authenticité",
    description:
      "Nos recettes puisent leur inspiration dans les traditions culinaires d'Asie du Sud-Est, respectées et transmises avec fidélité et amour.",
  },
  {
    icon: Clock,
    title: "Produits frais",
    description:
      "Chaque jour, nous sélectionnons des ingrédients frais et de qualité. Nos légumes, herbes et viandes sont choisis avec le plus grand soin pour garantir une cuisine vivante.",
  },
  {
    icon: Users,
    title: "Convivialité",
    description:
      "Kim-Hi Noodle est avant tout un lieu de vie, de partage et de rencontres. Nous accueillons chaque convive comme un ami et créons des moments précieux autour de la table.",
  },
]

const PrinciplesSection = () => {
  return (
    <section className="bg-khn-cream py-20 small:py-28">
      <div className="content-container">
        <RevealWrapper direction="up">
          <div className="flex flex-col items-center text-center gap-5 mb-16 small:mb-20">
            <p className="text-khn-gold text-sm font-medium uppercase tracking-widest">
              Nos principes
            </p>

            <h2 className="font-display uppercase text-2xl xsmall:text-4xl small:text-5xl leading-tight text-stone-900">
              Ce que vous retrouvez chez nous
            </h2>
          </div>
        </RevealWrapper>

        <div className="grid grid-cols-1 small:grid-cols-3 gap-8">
          {principles.map((principle, index) => {
            const Icon = principle.icon

            return (
              <RevealWrapper
                key={principle.title}
                direction="up"
                delay={index * 150}
              >
                <div className="flex flex-col items-center text-center gap-4 border border-stone-200 p-10 h-full">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-khn-gold/40">
                    <Icon className="h-6 w-6 text-khn-gold" />
                  </div>

                  <h3 className="font-display text-2xl text-stone-900">
                    {principle.title}
                  </h3>

                  <span className="h-0.5 w-10 bg-khn-gold" />

                  <p className="text-stone-600 text-base leading-relaxed">
                    {principle.description}
                  </p>
                </div>
              </RevealWrapper>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default PrinciplesSection
