type ShowcaseNoticeProps = {
  note: string
}

// The Mode vitrine's encadré (docs/specs/mode-vitrine.md, "Storefront —
// rendu"): sits in the page's own flow, right where the ordering controls
// it replaces used to be — never fixed, never sitewide like the Annonce
// bandeau (ADR 0009), so the two never read as two stacked banners. Plain
// text only, whitespace-pre-line preserves the restaurateur's paragraph
// breaks without parsing the note as markup — never dangerouslySetInnerHTML.
// role="status" because it informs, it does not interrupt: no close button,
// no link, no client-side persistence.
export default function ShowcaseNotice({ note }: ShowcaseNoticeProps) {
  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-3"
      data-testid="showcase-notice"
    >
      <p className="whitespace-pre-line text-sm text-neutral-700">{note}</p>
    </div>
  )
}
