import { ResolvedFormuleCuration } from "../get-curation-for-variant"
import { formuleSelectionMetadataKey } from "../validate-selection"
import { resolveFormuleSelectionEntries } from "../resolve-selection-entries"

// PURE Sélection-formatting seam for the Ticket cuisine (ticket 05).
// Fixture built like src/lib/formule/__tests__/validate-selection.unit.spec.ts:
// a Curation, and a Sélection built against it — but this Curation carries
// the rank and readable Variante names the Ticket cuisine needs to display.

const entree = {
  key: "entree",
  label: "Entrée",
  rank: 1,
  curatedVariantIds: ["variant_boeuf", "variant_legumes"],
  curatedVariants: [
    { id: "variant_boeuf", name: "Samoussas — Bœuf" },
    { id: "variant_legumes", name: "Samoussas — Légumes" },
  ],
}
const plat = {
  key: "plat",
  label: "Plat",
  rank: 0,
  curatedVariantIds: ["variant_riz"],
  curatedVariants: [{ id: "variant_riz", name: "Riz Cantonais — Unique" }],
}
const curation: ResolvedFormuleCuration = {
  productId: "prod_menu_midi",
  productTitle: "Menu Midi",
  composants: [entree, plat],
}

describe("resolveFormuleSelectionEntries", () => {
  it("orders entries by Composant rank, not by the order of metadata's own keys", () => {
    const metadata = {
      [formuleSelectionMetadataKey("entree")]: "variant_boeuf",
      [formuleSelectionMetadataKey("plat")]: "variant_riz",
    }

    expect(resolveFormuleSelectionEntries(metadata, curation)).toEqual([
      { composantKey: "plat", label: "Plat", variantLabel: "Riz Cantonais — Unique" },
      { composantKey: "entree", label: "Entrée", variantLabel: "Samoussas — Bœuf" },
    ])
  })

  // A Variante can be un-curated from its Composant at any time (spec User
  // Story 6). The line must still show something a cuisinier can cook from.
  it("falls back to the raw Variante id when it is no longer curated for its Composant", () => {
    const metadata = {
      [formuleSelectionMetadataKey("plat")]: "variant_discontinued",
    }

    expect(resolveFormuleSelectionEntries(metadata, curation)).toEqual([
      { composantKey: "plat", label: "Plat", variantLabel: "variant_discontinued" },
    ])
  })

  // A Composant can be removed from a Formule entirely; its key then
  // matches nothing in the current Curation at all.
  it("falls back to the raw Composant key and Variante id when no Composant matches", () => {
    const metadata = {
      [formuleSelectionMetadataKey("dessert")]: "variant_glace",
    }

    expect(resolveFormuleSelectionEntries(metadata, curation)).toEqual([
      { composantKey: "dessert", label: "dessert", variantLabel: "variant_glace" },
    ])
  })

  it("falls back to raw entries entirely when there is no Curation to resolve against", () => {
    const metadata = {
      [formuleSelectionMetadataKey("entree")]: "variant_boeuf",
    }

    expect(resolveFormuleSelectionEntries(metadata, null)).toEqual([
      { composantKey: "entree", label: "entree", variantLabel: "variant_boeuf" },
    ])
  })

  it("returns an empty list for null or undefined metadata", () => {
    expect(resolveFormuleSelectionEntries(null, curation)).toEqual([])
    expect(resolveFormuleSelectionEntries(undefined, curation)).toEqual([])
  })

  it("ignores Sélection-shaped keys with a non-string or empty value", () => {
    const metadata = {
      [formuleSelectionMetadataKey("plat")]: 42,
      [formuleSelectionMetadataKey("entree")]: "",
    }

    expect(resolveFormuleSelectionEntries(metadata, curation)).toEqual([])
  })
})
