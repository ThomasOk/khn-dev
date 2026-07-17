import {
  FormuleComposantCuration,
  FormuleCuration,
  formuleSelectionMetadataKey,
  validateFormuleSelection,
} from "../validate-selection"

// Seam 1 of the spec: the pure Sélection-contre-Curation control, exercised
// with no database. Mirrors src/lib/slots/__tests__/derive-slots.unit.spec.ts.

const entree: FormuleComposantCuration = {
  key: "entree",
  label: "Entrée",
  curatedVariantIds: ["variant_samoussas_boeuf", "variant_samoussas_legumes"],
}
const plat: FormuleComposantCuration = {
  key: "plat",
  label: "Plat",
  curatedVariantIds: ["variant_riz_cantonais"],
}
const curation: FormuleCuration = { composants: [entree, plat] }

const validSelection = {
  [formuleSelectionMetadataKey("entree")]: "variant_samoussas_boeuf",
  [formuleSelectionMetadataKey("plat")]: "variant_riz_cantonais",
}

describe("validateFormuleSelection", () => {
  it("accepts a Sélection that fills every Composant with one of its curated Variantes", () => {
    expect(validateFormuleSelection(curation, validSelection)).toEqual({
      valid: true,
    })
  })

  it("accepts a line with no Curation and no Sélection keys — an ordinary, non-Formule product", () => {
    expect(validateFormuleSelection(null, { some_other_key: "x" })).toEqual({
      valid: true,
    })
    expect(validateFormuleSelection(null, null)).toEqual({ valid: true })
  })

  it("rejects a Sélection on a line whose Variante is not a Formule", () => {
    const result = validateFormuleSelection(null, validSelection)
    expect(result).toEqual({
      valid: false,
      rejection: { code: "not_a_formule" },
    })
  })

  it("rejects a missing Composant", () => {
    const { [formuleSelectionMetadataKey("plat")]: _omitted, ...incomplete } =
      validSelection

    const result = validateFormuleSelection(curation, incomplete)
    expect(result).toEqual({
      valid: false,
      rejection: { code: "missing_composant", composant: plat },
    })
  })

  it("rejects a Sélection key that matches no Composant of this Formule", () => {
    const result = validateFormuleSelection(curation, {
      ...validSelection,
      [formuleSelectionMetadataKey("dessert")]: "variant_glace",
    })
    expect(result).toEqual({
      valid: false,
      rejection: { code: "unknown_key", key: formuleSelectionMetadataKey("dessert") },
    })
  })

  // The case that protects the margin: the Variante IS curated somewhere in
  // this Formule, just not for the Composant it was submitted against. It is
  // not enough to check membership in the Formule's Curation as a whole.
  it("rejects a Variante curated for a DIFFERENT Composant of the same Formule, not the one it was submitted for", () => {
    const result = validateFormuleSelection(curation, {
      ...validSelection,
      [formuleSelectionMetadataKey("plat")]: "variant_samoussas_boeuf",
    })
    expect(result).toEqual({
      valid: false,
      rejection: {
        code: "variant_not_curated",
        composant: plat,
        variantId: "variant_samoussas_boeuf",
      },
    })
  })

  it("rejects a Variante that isn't curated anywhere in the Formule", () => {
    const result = validateFormuleSelection(curation, {
      ...validSelection,
      [formuleSelectionMetadataKey("plat")]: "variant_the_most_expensive_dish",
    })
    expect(result).toEqual({
      valid: false,
      rejection: {
        code: "variant_not_curated",
        composant: plat,
        variantId: "variant_the_most_expensive_dish",
      },
    })
  })

  it("rejects a non-string Sélection value", () => {
    const result = validateFormuleSelection(curation, {
      ...validSelection,
      [formuleSelectionMetadataKey("plat")]: 42,
    })
    expect(result).toEqual({
      valid: false,
      rejection: { code: "missing_composant", composant: plat },
    })
  })
})
