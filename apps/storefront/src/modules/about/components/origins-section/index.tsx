import Image from "next/image"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

const OriginsSection = () => {
  return (
    <section className="bg-khn-cream py-20 small:py-28">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-2 gap-12 small:gap-20 items-center">
          <RevealWrapper direction="left">
            <div className="flex flex-col gap-6">
              <p className="text-khn-gold text-sm font-medium uppercase tracking-widest">
                Nos origines
              </p>

              <h2 className="font-display uppercase text-4xl small:text-5xl leading-tight text-stone-900">
                Comment est né
                <br />
                Kim-Hi Noodle
              </h2>

              <span className="h-0.5 w-14 bg-khn-gold" />

              <div className="flex flex-col gap-4 text-stone-600 text-base leading-relaxed">
                <p className="font-semibold text-stone-800">
                  « Je suis tombé amoureux d&apos;elle devant mon bol de
                  nouilles… »
                </p>
                <p>
                  Je m&apos;appelle Chetra. Chef expérimenté, je porte un
                  amour particulier à un bol de nouilles, celles-ci étant
                  prohibées lors de certaines occasions car symbolisent la
                  longévité en Asie, surtout si elles sont longues.
                </p>
                <p>
                  Si vous n&apos;avez pas encore mangé une soupe de nouilles
                  Phnom Penh, il sera difficile d&apos;apprécier
                  l&apos;enthousiasme et l&apos;audace des gens du Cambodge,
                  le bouillon dégageant un goût tentant et accrocheur. Chaque
                  jour à Battambang, ma ville natale, commence par un bol de
                  nouilles, parfumées, colorées, moelleuses, réchauffant
                  l&apos;âme des habitants.
                </p>
                <p>
                  Bien qu&apos;en France, le parfum persistant des nouilles
                  me ramène toujours dans les ruelles de Battambang, et en
                  particulier, une ruelle qui a représenté ce moment de
                  bascule, où mon amour pour elle, Rina, a pris naissance.
                </p>
              </div>
            </div>
          </RevealWrapper>

          <RevealWrapper direction="right" delay={150}>
            <div className="relative aspect-[6/5] w-full overflow-hidden">
              <Image
                src="/images/origins_about.webp"
                alt="Chetra et Rina devant le restaurant Kim-Hi Noodle"
                fill
                className="object-cover object-[58%_35%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  )
}

export default OriginsSection
