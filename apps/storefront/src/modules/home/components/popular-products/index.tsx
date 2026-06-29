import { getCollectionByHandle } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

const PopularProducts = async ({ region }: { region: HttpTypes.StoreRegion }) => {
  const collection = await getCollectionByHandle("nos-incontournables")

  const queryParams = {
    limit: 4,
    fields: "*variants.calculated_price",
    ...(collection ? { collection_id: collection.id } : {}),
  }

  const {
    response: { products },
  } = await listProducts({ regionId: region.id, queryParams })

  if (!products.length) return null

  return (
    <section className="bg-white py-20 small:py-28">
      <div className="content-container">
        <RevealWrapper>
          <div className="flex flex-col items-center gap-3 mb-12 text-center">
            <p className="text-orange-600 text-sm font-medium uppercase tracking-widest">
              Nos Incontournables
            </p>
            <h2 className="font-display text-4xl small:text-5xl leading-tight text-stone-900">
              Les plats qui reviennent toujours
            </h2>
          </div>
        </RevealWrapper>

        <div className="flex small:grid small:grid-cols-4 gap-6 overflow-x-auto small:overflow-visible snap-x snap-mandatory small:snap-none no-scrollbar pb-4 small:pb-0">
          {products.map((product, i) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[72vw] xsmall:w-[48vw] small:w-auto"
            >
              <RevealWrapper delay={i * 80}>
                <ProductPreview product={product} region={region} />
              </RevealWrapper>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PopularProducts
