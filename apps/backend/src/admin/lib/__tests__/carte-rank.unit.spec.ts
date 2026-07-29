import { buildCarteRankBatchUpdate } from "../carte-rank"

// The one seam this feature protects with a test (docs/specs/rang-des-produits.md,
// "La logique d'attribution des Rangs est une fonction pure, hors du composant,
// et testée") — turning a drag-and-dropped list into the batch update payload
// that rewrites a whole Section densely as 0…N-1. Same folder, same shape as
// admin/lib/formule.ts and its unit spec — the named prior art.

describe("buildCarteRankBatchUpdate", () => {
  it("assigns dense ranks 0…N-1, in the order of the list", () => {
    expect(
      buildCarteRankBatchUpdate([
        { id: "prod_c", metadata: null },
        { id: "prod_a", metadata: null },
        { id: "prod_b", metadata: null },
      ])
    ).toEqual([
      { id: "prod_c", metadata: { carte_rank: 0 } },
      { id: "prod_a", metadata: { carte_rank: 1 } },
      { id: "prod_b", metadata: { carte_rank: 2 } },
    ])
  })

  it("preserves the product's existing metadata, changing only carte_rank", () => {
    expect(
      buildCarteRankBatchUpdate([
        { id: "prod_a", metadata: { some_other_key: "kept", carte_rank: 7 } },
      ])
    ).toEqual([
      { id: "prod_a", metadata: { some_other_key: "kept", carte_rank: 0 } },
    ])
  })

  it("gives a product with no prior metadata an object containing just its rank", () => {
    expect(buildCarteRankBatchUpdate([{ id: "prod_a" }])).toEqual([
      { id: "prod_a", metadata: { carte_rank: 0 } },
    ])
    expect(
      buildCarteRankBatchUpdate([{ id: "prod_b", metadata: null }])
    ).toEqual([{ id: "prod_b", metadata: { carte_rank: 0 } }])
  })

  it("handles a section of a single product", () => {
    expect(
      buildCarteRankBatchUpdate([{ id: "prod_a", metadata: {} }])
    ).toEqual([{ id: "prod_a", metadata: { carte_rank: 0 } }])
  })

  it("handles an empty section", () => {
    expect(buildCarteRankBatchUpdate([])).toEqual([])
  })

  it("returns a payload containing only the products of the reordered section", () => {
    const result = buildCarteRankBatchUpdate([
      { id: "prod_a", metadata: {} },
      { id: "prod_b", metadata: {} },
    ])

    expect(result).toHaveLength(2)
    expect(result.map((update) => update.id)).toEqual(["prod_a", "prod_b"])
  })
})
