import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

type CategoryTile = {
  name: string
  handle: string
  image: string
}

const categories: CategoryTile[] = [
  { name: "Entrées", handle: "entrees", image: "/images/home_entree.png" },
  { name: "Plats", handle: "plats", image: "/images/home_plats.png" },
  { name: "Soupes", handle: "soupes", image: "/images/home_soupe.png" },
]

const PopularProducts = () => {
  return (
    <section className="bg-khn-cream py-20 small:py-28">
      <div className="content-container">
        <RevealWrapper>
          <div className="flex flex-col items-center gap-4 mb-12 text-center">
            <h2 className="font-display uppercase text-4xl small:text-5xl leading-tight text-stone-900">
              Explorez notre univers culinaire
            </h2>
            <span className="block h-1 w-16 bg-orange-500" />
            <p className="text-stone-600 text-base">
              Laissez-vous guider à travers nos spécialités traditionnelles.
            </p>
          </div>
        </RevealWrapper>

        <div className="grid grid-cols-1 small:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 small:px-10">
          {categories.map((category, i) => (
            <RevealWrapper key={category.handle} delay={i * 100}>
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                className="group flex h-full flex-col bg-white"
              >
                <div className="relative aspect-[5/3] overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover object-bottom transition-transform duration-300 ease-out [@media(hover:hover)]:group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col items-center px-6 py-8 min-h-[180px] small:min-h-[200px]">
                  <div className="flex flex-1 items-center">
                    <h3 className="font-display uppercase text-2xl small:text-3xl text-stone-900">
                      {category.name}
                    </h3>
                  </div>
                  <span className="text-stone-400 text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-200 [@media(hover:hover)]:group-hover:text-orange-600 [@media(hover:hover)]:group-hover:underline">
                    Voir la carte
                  </span>
                </div>
              </LocalizedClientLink>
            </RevealWrapper>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PopularProducts
