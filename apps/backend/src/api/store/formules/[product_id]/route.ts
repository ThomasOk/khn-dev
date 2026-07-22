import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  QueryContext,
} from "@medusajs/framework/utils"

// GET /store/formules/:product_id — the read-only projection of the Curation
// (ticket 01) that the storefront selector consumes: for a given Formule
// Produit, its Composants ordered by rank and, for each, the curated
// Variantes (id, title, calculated_price). It never writes anything and knows
// nothing of a Sélection — that is the storefront's job at add-to-cart.
//
// `product_id`/`product_title` ride along on every curated Variante so the
// storefront can group Variantes of the same Produit into one card with a
// Variante picker, instead of one flat row per curated Variante (a Produit
// with several Options otherwise explodes into one row per combination).
// The Curation itself stays Variante-grained in the admin (ADR 0005) — this
// is a storefront presentation grouping, not a change to what's curated.
//
// `region_id` is required because the curated Variantes' prices are resolved
// by the pricing engine like any other Variante (same contract as the native
// /store/products route) — there is no price without a currency to price in.
// `null` when the Produit isn't a Formule: a normal state, not an error, so
// it's a 200 rather than a 404 (same choice as the admin equivalent route).
//
// Medusa auto-names the sole Variante of a Produit with no real Options
// "Default variant" (kitchen-ticket.ts's DEFAULT_VARIANT_TITLE — every
// curated dish, being its own single-Variante Produit, hits this) — a label
// with no meaning to the client, so the Produit's own title is shown instead
// (spec: "par nom lisible", never by ID). Kept as its own copy rather than
// imported, same layering as admin/lib/formule.ts's variantDisplayName and
// src/lib/formule/get-curation-for-variant.ts's curatedVariantName.
const DEFAULT_VARIANT_TITLE = "Default variant"

function curatedVariantTitle(variant: {
  title: string
  product?: { title: string } | null
}): string {
  const hasMeaningfulVariantTitle = variant.title !== DEFAULT_VARIANT_TITLE

  if (hasMeaningfulVariantTitle && variant.product?.title) {
    return `${variant.product.title} — ${variant.title}`
  }

  return variant.product?.title ?? variant.title
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = req.params
  const region_id = req.query.region_id as string | undefined

  if (!region_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "region_id is required"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
    filters: { id: region_id },
  })
  const region = regions[0]
  if (!region) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Region with id ${region_id} not found`
    )
  }

  const { data } = await query.graph({
    entity: "formule",
    fields: [
      "id",
      "product_id",
      "composants.id",
      "composants.key",
      "composants.label",
      "composants.rank",
      "composants.product_variants.id",
      "composants.product_variants.title",
      "composants.product_variants.product_id",
      "composants.product_variants.product.title",
      "composants.product_variants.product.thumbnail",
    ],
    filters: { product_id },
  })

  const formule = data[0]
  if (!formule) {
    return res.json({ formule: null })
  }

  // The Curation link (src/links/formule-composant-variant.ts) carries no
  // price column, so the Variantes' calculated prices are resolved
  // separately, straight off the pricing engine, the same way the native
  // store product-variants route does for a root `variant` entity.
  const variantIds = Array.from(
    new Set(
      formule.composants.flatMap((composant) =>
        (composant?.product_variants ?? []).map((variant) => variant!.id)
      )
    )
  )

  // `calculated_price` is a computed pricing field, not a column on the
  // ProductVariant module type — the query-graph generic can't derive it from
  // the field list, so the result is typed explicitly here.
  type PricedVariant = { id: string; calculated_price: Record<string, unknown> | null }

  const { data: pricedVariants } = variantIds.length
    ? ((await query.graph({
        entity: "variant",
        fields: ["id", "calculated_price.*"],
        filters: { id: variantIds },
        context: {
          calculated_price: QueryContext({
            region_id: region.id,
            currency_code: region.currency_code,
          }),
        },
      })) as unknown as { data: PricedVariant[] })
    : { data: [] as PricedVariant[] }

  const priceByVariantId = new Map(
    pricedVariants.map((variant) => [variant.id, variant.calculated_price])
  )

  const composants = [...formule.composants]
    .sort((a, b) => (a?.rank ?? 0) - (b?.rank ?? 0))
    .map((composant) => ({
      id: composant!.id,
      key: composant!.key,
      label: composant!.label,
      rank: composant!.rank,
      variants: (composant!.product_variants ?? []).map((variant) => ({
        id: variant!.id,
        title: curatedVariantTitle(variant!),
        variant_title: variant!.title,
        product_id: variant!.product_id,
        product_title: variant!.product?.title ?? variant!.title,
        thumbnail: variant!.product?.thumbnail ?? null,
        calculated_price: priceByVariantId.get(variant!.id) ?? null,
      })),
    }))

  res.json({
    formule: {
      id: formule.id,
      product_id: formule.product_id,
      composants,
    },
  })
}
