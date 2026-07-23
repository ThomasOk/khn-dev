import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

const StorySection = () => {
  return (
    <section className="relative bg-khn-teal bg-[url('/images/pattern_bg.png')] bg-repeat bg-[length:1400px_auto] min-h-[85vh] flex items-center py-16 small:py-24">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-2 items-stretch max-w-5xl mx-auto">
          <RevealWrapper direction="left">
            <div className="flex flex-col justify-center gap-6 h-full bg-khn-teal-panel p-8 small:p-10">
              <h2 className="font-display uppercase text-4xl small:text-5xl leading-tight text-white">
                Ici, les nouilles ont une histoire.
              </h2>
              <span className="block h-1 w-16 bg-orange-500" />
              <p className="text-white/80 text-base leading-relaxed max-w-md">
                Kim-Hi Noodle est née d&apos;une envie simple. Celle de partager
                les saveurs du Cambodge avec sincérité et générosité. Des
                nouilles artisanales, des bouillons travaillés avec soin, une
                carte qui voyage entre les grandes traditions culinaires
                asiatiques.
              </p>
              <LocalizedClientLink
                href="/about"
                className="self-start inline-flex items-center min-h-[44px] px-6 py-3 border border-white text-white text-xs tracking-[0.15em] uppercase transition-[background-color,color,transform] duration-200 motion-safe:active:scale-[0.97] [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-khn-teal"
              >
                Notre histoire
              </LocalizedClientLink>
            </div>
          </RevealWrapper>

          <RevealWrapper direction="right" delay={150}>
            <div className="relative h-full min-h-[380px] small:min-h-[520px]">
              <Image
                src="/images/restaurant_story.png"
                alt="Façade du restaurant Kim-Hi Noodle"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  )
}

export default StorySection
