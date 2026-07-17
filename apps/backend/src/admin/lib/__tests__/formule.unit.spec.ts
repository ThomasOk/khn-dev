import { Formule, formuleSelectionEntries, resolveFormuleSelectionEntries } from "../formule"

// Pure parsing seam for the order widget (ticket 05): turns a line item's
// raw metadata into the `{ composantKey, variantId }` pairs the widget
// resolves against a Formule's Curation. Mirrors
// src/lib/formule/__tests__/validate-selection.unit.spec.ts's key format,
// kept as a separate client-side copy per the admin/lib convention
// (admin/lib/pickup.ts mirrors apps/storefront's key format the same way).

describe("formuleSelectionEntries", () => {
  it("extracts one entry per formule_<key>_variant_id key", () => {
    expect(
      formuleSelectionEntries({
        formule_entree_variant_id: "variant_samoussas_boeuf",
        formule_plat_variant_id: "variant_riz_cantonais",
      })
    ).toEqual([
      { composantKey: "entree", variantId: "variant_samoussas_boeuf" },
      { composantKey: "plat", variantId: "variant_riz_cantonais" },
    ])
  })

  it("returns an empty list for metadata with no Sélection keys", () => {
    expect(formuleSelectionEntries({ some_other_key: "x" })).toEqual([])
  })

  it("returns an empty list for null or undefined metadata", () => {
    expect(formuleSelectionEntries(null)).toEqual([])
    expect(formuleSelectionEntries(undefined)).toEqual([])
  })

  it("ignores a Sélection-shaped key with a non-string or empty value", () => {
    expect(
      formuleSelectionEntries({
        formule_entree_variant_id: 42,
        formule_plat_variant_id: "",
      })
    ).toEqual([])
  })
})

// The formule fixture below mirrors what GET /admin/formules/:product_id
// returns: Composants pre-sorted by rank, each with the Variantes currently
// curated into it.
const boeuf = {
  id: "variant_boeuf",
  title: "Bœuf",
  product: { title: "Samoussas" },
}
const legumes = {
  id: "variant_legumes",
  title: "Légumes",
  product: { title: "Samoussas" },
}
const rizCantonais = {
  id: "variant_riz",
  title: "Unique",
  product: { title: "Riz Cantonais" },
}
const formule: Formule = {
  id: "formule_1",
  product_id: "prod_menu_midi",
  composants: [
    {
      id: "composant_entree",
      key: "entree",
      label: "Entrée",
      rank: 0,
      product_variants: [boeuf, legumes],
    },
    {
      id: "composant_plat",
      key: "plat",
      label: "Plat",
      rank: 1,
      product_variants: [rizCantonais],
    },
  ],
}

describe("resolveFormuleSelectionEntries", () => {
  it("resolves each entry's Composant label and Variante display name, in Composant rank order", () => {
    expect(
      resolveFormuleSelectionEntries(
        [
          { composantKey: "plat", variantId: "variant_riz" },
          { composantKey: "entree", variantId: "variant_boeuf" },
        ],
        formule
      )
    ).toEqual([
      { composantKey: "entree", label: "Entrée", variantLabel: "Samoussas — Bœuf" },
      { composantKey: "plat", label: "Plat", variantLabel: "Riz Cantonais — Unique" },
    ])
  })

  // A Variante can be un-curated from a Composant at any time (spec User
  // Story 6, "réagir à une rupture de stock"), which can happen after an
  // order carrying it was already placed. The line must still show
  // something a restaurateur can cook from — the raw id, not a vanished
  // line — rather than silently disappearing (the exact failure User Story
  // 17 exists to prevent).
  it("falls back to the raw variant id when the Variante is no longer curated for its Composant", () => {
    expect(
      resolveFormuleSelectionEntries(
        [{ composantKey: "entree", variantId: "variant_discontinued" }],
        formule
      )
    ).toEqual([
      { composantKey: "entree", label: "Entrée", variantLabel: "variant_discontinued" },
    ])
  })

  // A Composant can be deleted from a Formule entirely; its key then
  // matches nothing in the Curation at all.
  it("falls back to the raw key and variant id when no Composant matches the entry's key", () => {
    expect(
      resolveFormuleSelectionEntries(
        [{ composantKey: "dessert", variantId: "variant_glace" }],
        formule
      )
    ).toEqual([
      { composantKey: "dessert", label: "dessert", variantLabel: "variant_glace" },
    ])
  })

  it("falls back to raw entries entirely when there is no Curation to resolve against", () => {
    expect(
      resolveFormuleSelectionEntries(
        [{ composantKey: "entree", variantId: "variant_boeuf" }],
        null
      )
    ).toEqual([{ composantKey: "entree", label: "entree", variantLabel: "variant_boeuf" }])
  })
})
