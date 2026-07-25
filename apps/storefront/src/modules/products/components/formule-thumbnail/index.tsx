import React from "react"

type FormuleThumbnailProps = {
  title: string
  "data-testid"?: string
}

// A Formule has no product image of its own (docs/adr/0001,
// docs/specs/commande-depuis-la-page-carte.md — it's chosen on its
// Composants, not a photo). This stands in its place wherever a regular
// Thumbnail would go, so cart rows keep the same layout without showing a
// misleading or generic placeholder photo.
//
// Mirrors Thumbnail's sizing convention: it never sets its own width, only
// `w-full` — the caller wraps it in a sized element (matching whatever
// wrapper the equivalent Thumbnail call uses) so both fill their wrapper
// identically. Adding a width class here directly would tie against that
// `w-full` at equal specificity, and the loser depends on Tailwind's
// generated stylesheet order, not JSX order (the same class of bug fixed in
// formule-composer-modal.tsx's bg-white/bg-khn-gold conflict).
const FormuleThumbnail: React.FC<FormuleThumbnailProps> = ({
  title,
  "data-testid": dataTestid,
}) => {
  return (
    <div
      className="relative w-full aspect-[1/1] overflow-hidden bg-khn-teal flex items-center justify-center rounded-rounded"
      data-testid={dataTestid}
    >
      <span className="font-display font-semibold text-white/90 tracking-wide text-lg uppercase">
        {formuleInitials(title)}
      </span>
    </div>
  )
}

function formuleInitials(title: string): string {
  return title
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default FormuleThumbnail
