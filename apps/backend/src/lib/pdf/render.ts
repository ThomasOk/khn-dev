import pdfmake from "pdfmake"

// pdfmake@0.3.x ships no TypeScript types of its own, and the community
// @types/pdfmake package targets the pre-0.3 `PdfPrinter` constructor API
// (ADR 0002's documented trap) — installing it here would type-check against
// an API this codebase doesn't use. `Record<string, any>` is deliberate: the
// exact shape of a docDefinition belongs to each template (kitchen-ticket.ts,
// and later the Facture), never to this file.
export type PdfMakeDocDefinition = Record<string, any>

let fontsRegistered = false

// pdfmake's 0.3 singleton (`require("pdfmake")`, not `new PdfPrinter(fonts)`
// — see ADR 0002) needs its fonts registered once per process before the
// first `createPdf`. Roboto ships inside the pdfmake package itself, so this
// needs no font file of our own.
function ensureFontsRegistered(): void {
  if (fontsRegistered) return

  pdfmake.addFonts({
    Roboto: {
      normal: require.resolve("pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
      bold: require.resolve("pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
      italics: require.resolve("pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
      bolditalics: require.resolve("pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf"),
    },
  })
  fontsRegistered = true
}

// The single piece shared between the Facture and the Ticket cuisine
// (CONTEXT.md forbids sharing the template, not the rendering engine): turn
// a pdfmake docDefinition into the base64 string Medusa's notification
// `Attachment.content` expects. Knows nothing about what a ticket or a
// facture contains.
export async function renderPdfDocDefinitionToBase64(
  docDefinition: PdfMakeDocDefinition
): Promise<string> {
  ensureFontsRegistered()
  const buffer: Buffer = await pdfmake.createPdf(docDefinition).getBuffer()
  return buffer.toString("base64")
}
