import { PDFParse } from "pdf-parse"
import { ResolvedFormuleCuration } from "../../formule/get-curation-for-variant"
import { formuleSelectionMetadataKey } from "../../formule/validate-selection"
import { renderPdfDocDefinitionToBase64 } from "../render"
import { buildKitchenTicketDocDefinition, KitchenTicketOrder } from "../kitchen-ticket"

// Seam 1 of the spec: buildKitchenTicketDocDefinition -> pdfmake -> a
// buffer, asserted on directly (no DB, no network, no container). Mirrors
// src/lib/slots/__tests__/derive-slots.unit.spec.ts.

// 80mm in points, hard-coded rather than re-derived from the source's own
// constant — the point is to catch the source constant drifting, not to
// restate it.
const WIDTH_80MM_PT = 226.771654

async function renderToBuffer(order: KitchenTicketOrder): Promise<Buffer> {
  const base64 = await renderPdfDocDefinitionToBase64(buildKitchenTicketDocDefinition(order))
  return Buffer.from(base64, "base64")
}

// Read directly off the PDF's own /MediaBox and /Pages /Count, in dur, per
// the spec's Seam 1 instruction — no PDF-inspection library for this part.
function mediaBox(buffer: Buffer): { width: number; height: number } {
  const raw = buffer.toString("latin1")
  const match = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/)
  if (!match) throw new Error("No /MediaBox found in buffer")
  return { width: Number(match[1]), height: Number(match[2]) }
}

function pageCount(buffer: Buffer): number {
  const raw = buffer.toString("latin1")
  const match = raw.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/)
  if (!match) throw new Error("No /Pages /Count found in buffer")
  return Number(match[1])
}

async function extractText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  const { text } = await parser.getText()
  await parser.destroy()

  // pdfmake word-wraps long lines at this narrow width, and pdf-parse turns
  // each wrapped visual line into its own "\n" — an artifact of layout, not
  // a paragraph break. Collapsing whitespace makes assertions test content
  // adjacency, not incidental wrap points.
  return text.replace(/\s+/g, " ").trim()
}

const baseOrder: KitchenTicketOrder = {
  customer_name: "Marie Dupont",
  customer_phone: "0601020304",
  pickup_slot_start: "2026-07-16T12:15:00+02:00",
  pickup_slot_end: "2026-07-16T12:30:00+02:00",
  items: [
    { title: "Nouilles sautées", variant_title: "Bœuf, Saté (contient arachide)", quantity: 1 },
    { title: "Samoussas", variant_title: "Légumes", quantity: 2 },
  ],
}

function orderWithItemCount(count: number): KitchenTicketOrder {
  const items = Array.from({ length: count }, (_, i) => ({
    title: `Plat ${i}`,
    variant_title: "Nature",
    quantity: 1,
  }))
  return { ...baseOrder, items }
}

describe("buildKitchenTicketDocDefinition", () => {
  it("renders a single page at the 80mm (226.77pt) roll width", async () => {
    const buffer = await renderToBuffer(baseOrder)

    expect(pageCount(buffer)).toBe(1)
    expect(mediaBox(buffer).width).toBeCloseTo(WIDTH_80MM_PT, 2)
  })

  it("grows the page height with the number of order lines, never paginates", async () => {
    const shortBuffer = await renderToBuffer(orderWithItemCount(2))
    const longBuffer = await renderToBuffer(orderWithItemCount(20))

    expect(pageCount(shortBuffer)).toBe(1)
    expect(pageCount(longBuffer)).toBe(1)
    expect(mediaBox(longBuffer).height).toBeGreaterThan(mediaBox(shortBuffer).height)
  })

  it("shows the Créneau first, then the customer, then each line item in order", async () => {
    const text = await extractText(await renderToBuffer(baseOrder))

    const slotIndex = text.indexOf("jeu. 16/07 · 12:15–12:30")
    const nameIndex = text.indexOf("Marie Dupont")
    const phoneIndex = text.indexOf("0601020304")
    const firstItemIndex = text.indexOf("Nouilles sautées")
    const secondItemIndex = text.indexOf("Samoussas")

    expect(slotIndex).toBeGreaterThanOrEqual(0)
    expect(nameIndex).toBeGreaterThan(slotIndex)
    expect(phoneIndex).toBeGreaterThan(nameIndex)
    expect(firstItemIndex).toBeGreaterThan(phoneIndex)
    expect(secondItemIndex).toBeGreaterThan(firstItemIndex)
  })

  it("never lets a plat's seasoning or allergen text land apart from the plat itself", async () => {
    const text = await extractText(await renderToBuffer(baseOrder))

    expect(text).toContain("Nouilles sautées — Bœuf, Saté (contient arachide)")
  })

  it("never shows a unit price or a total", async () => {
    const text = await extractText(await renderToBuffer(baseOrder))

    expect(text).not.toContain("€")
    expect(text.toLowerCase()).not.toContain("total")
  })

  it("keeps accents intact — Bœuf, never Buf or a replacement character", async () => {
    const text = await extractText(await renderToBuffer(baseOrder))

    expect(text).toContain("Bœuf")
    expect(text).not.toContain("�")
  })
})

// Ticket 05: a Formule line's Sélection, resolved server-side via
// getFormuleCurationForVariant + resolveFormuleSelectionEntries rather than
// duplicated here. Fixture built like
// src/lib/formule/__tests__/validate-selection.unit.spec.ts and
// resolve-selection-entries.unit.spec.ts (a Curation, a Sélection on it) —
// ranks deliberately out of key order, per the spec's own instruction to
// prove rank order rather than metadata's own key order.
const plat = {
  key: "plat",
  label: "Plat",
  rank: 0,
  curatedVariantIds: ["variant_riz"],
  curatedVariants: [{ id: "variant_riz", name: "Riz Cantonais" }],
}
const entree = {
  key: "entree",
  label: "Entrée",
  rank: 1,
  curatedVariantIds: ["variant_samoussas_boeuf"],
  curatedVariants: [{ id: "variant_samoussas_boeuf", name: "Samoussas — Bœuf" }],
}
const menuMidiCuration: ResolvedFormuleCuration = {
  productId: "prod_menu_midi",
  productTitle: "Menu Midi",
  composants: [entree, plat],
}

describe("buildKitchenTicketDocDefinition — Formule Sélection", () => {
  it("shows a Formule line's Sélection, indented under its name, in Composant rank order", async () => {
    const order: KitchenTicketOrder = {
      ...baseOrder,
      items: [
        {
          title: "Menu Midi",
          quantity: 1,
          curation: menuMidiCuration,
          // Keys deliberately in the opposite order from rank, so a pass
          // that used metadata's own key order instead of rank would show
          // Entrée before Plat.
          metadata: {
            [formuleSelectionMetadataKey("entree")]: "variant_samoussas_boeuf",
            [formuleSelectionMetadataKey("plat")]: "variant_riz",
          },
        },
      ],
    }
    const text = await extractText(await renderToBuffer(order))

    const nameIndex = text.indexOf("Menu Midi")
    const platIndex = text.indexOf("Plat — Riz Cantonais")
    const entreeIndex = text.indexOf("Entrée — Samoussas — Bœuf")

    expect(nameIndex).toBeGreaterThanOrEqual(0)
    expect(platIndex).toBeGreaterThan(nameIndex)
    expect(entreeIndex).toBeGreaterThan(platIndex)
  })

  it("falls back to the raw Variante id when the Curation no longer resolves a Sélection", async () => {
    const order: KitchenTicketOrder = {
      ...baseOrder,
      items: [
        {
          title: "Menu Midi",
          quantity: 1,
          curation: menuMidiCuration,
          metadata: {
            [formuleSelectionMetadataKey("plat")]: "variant_discontinued",
          },
        },
      ],
    }
    const text = await extractText(await renderToBuffer(order))

    expect(text).toContain("Plat — variant_discontinued")
  })

  it("renders an ordinary, non-Formule line exactly as before — no Sélection block, no regression", async () => {
    const text = await extractText(await renderToBuffer(baseOrder))

    expect(text).toContain("Nouilles sautées — Bœuf, Saté (contient arachide)")
    expect(text).not.toContain("undefined")
  })
})
