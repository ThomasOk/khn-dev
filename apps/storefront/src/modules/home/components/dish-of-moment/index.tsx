import { getCollectionByHandle } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PreviewPrice from "@modules/products/components/product-preview/price"
import { getProductPrice } from "@lib/util/get-product-price"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

const DishOfMoment = async ({ region }: { region: HttpTypes.StoreRegion }) => {
  const collection = await getCollectionByHandle("plat-du-moment")
  if (!collection) return null

  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      limit: 1,
      fields: "*variants.calculated_price",
    },
  })

  const product = products[0]
  if (!product) return null

  const { cheapestPrice } = getProductPrice({ product })
  const image = product.thumbnail || product.images?.[0]?.url

  return (
    <section className="bg-stone-900 py-20 small:py-28">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-2 gap-12 small:gap-20 items-center">

          {image && (
            <RevealWrapper direction="left">
              <div className="relative aspect-square w-full overflow-hidden">
                <Image
                  src={image}
                  alt={product.title || "Plat du moment"}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </RevealWrapper>
          )}

          <RevealWrapper direction="right" delay={150}>
            <div className="flex flex-col gap-6">
              <p className="text-orange-500 text-sm font-medium uppercase tracking-widest">
                Plat du Moment
              </p>
              <h2 className="font-display text-4xl small:text-5xl leading-tight text-white">
                {product.title}
              </h2>
              {product.description && (
                <p className="text-stone-400 text-base leading-relaxed">
                  {product.description}
                </p>
              )}
              {cheapestPrice && (
                <div className="text-white text-2xl font-semibold">
                  <PreviewPrice price={cheapestPrice} />
                </div>
              )}
              <LocalizedClientLink
                href={`/products/${product.handle}`}
                className="self-start inline-flex items-center justify-center min-h-[44px] px-6 py-3 border border-white text-white text-sm font-medium transition-colors duration-200 [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-stone-900"
              >
                Commander ce plat
              </LocalizedClientLink>
            </div>
          </RevealWrapper>

        </div>
      </div>
    </section>
  )
}

export default DishOfMoment
