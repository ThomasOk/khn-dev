import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

const StorySection = () => {
  return (
    <section className="bg-khn-cream py-20 small:py-28">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-2 gap-12 small:gap-20 items-center">

          <RevealWrapper direction="left">
            <div className="flex flex-col gap-6">
              <p className="text-orange-600 text-sm font-medium uppercase tracking-widest">
                Notre Histoire
              </p>
              <h2 className="font-display text-4xl small:text-5xl leading-tight text-stone-900">
                Une passion pour les nouilles, une âme de quartier.
              </h2>
              <p className="text-stone-600 text-base leading-relaxed">
                Kim-Hi Noodle est né d&apos;une conviction simple : les meilleures
                nouilles sont celles qui se partagent. Fondé par une famille
                passionnée de cuisine asiatique, notre restaurant perpétue des
                recettes transmises de génération en génération, revisitées avec
                les produits frais du marché.
              </p>
              <p className="text-stone-600 text-base leading-relaxed">
                Chaque bol est préparé à la minute, avec des bouillons mijotés
                lentement et des garnitures soigneusement sélectionnées. Venez
                comme vous êtes — en famille, entre amis, ou pour une pause
                solitaire bien méritée.
              </p>
              <LocalizedClientLink
                href="/store"
                className="self-start inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-stone-900 text-white text-sm font-medium transition-colors duration-200 [@media(hover:hover)]:hover:bg-stone-700"
              >
                Découvrir la carte
              </LocalizedClientLink>
            </div>
          </RevealWrapper>

          <RevealWrapper direction="right" delay={150}>
            <div className="flex justify-center py-6 small:py-0">
              <div className="relative w-full mx-6 my-4">

                {/* Polaroid principal */}
                <div className="relative bg-white border-2 border-black p-3 pb-12 shadow-xl shadow-stone-300/50 rotate-[-2deg] transition-[transform,box-shadow] duration-300 ease-out will-change-transform motion-reduce:transition-none [@media(hover:hover)]:hover:rotate-0 [@media(hover:hover)]:hover:shadow-2xl">

                  {/* Zone image */}
                  <div className="relative aspect-[4/4.5] overflow-hidden border-2 border-black">
                    <Image
                      src="/images/restaurant_story.png"
                      alt="L'équipe Kim-Hi Noodle en cuisine"
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>

                  {/* Bande caption polaroid */}
                  <p
                    className="text-center text-black text-lg font-bold mt-4 font-cursive select-none pointer-events-none"
                    aria-hidden="true"
                  >
                    Kim-Hi Noodle <span className="font-black">♡</span>
                  </p>

                </div>
              </div>
            </div>
          </RevealWrapper>

        </div>
      </div>
    </section>
  )
}

export default StorySection
