import { ResolvedFormuleCuration } from "./get-curation-for-variant"
import { SELECTION_KEY_PATTERN, formuleSelectionMetadataKey } from "./validate-selection"

// Server pendant of admin/lib/formule.ts's resolveFormuleSelectionEntries,
// not its import: the admin bundle runs in the browser and doesn't share
// this code (admin/lib convention, cf. admin/lib/pickup.ts). The fallback —
// a raw id rather than a vanished entry when Curation can no longer resolve
// a Composant or a Variante — is deliberately identical: a Sélection the
// kitchen can still decipher beats an invisible one (spec User Story 17 /
// User Story 6, "réagir à une rupture de stock").
export type ResolvedFormuleSelectionEntry = {
  composantKey: string
  label: string
  variantLabel: string
}

// PURE — no database, no container. Turns a line item's flat metadata into
// the Ticket cuisine's Sélection entries, ordered by the Composant's own
// rank (spec: never the technical order of metadata's own keys).
export function resolveFormuleSelectionEntries(
  metadata: Record<string, unknown> | null | undefined,
  curation: ResolvedFormuleCuration | null | undefined
): ResolvedFormuleSelectionEntry[] {
  if (!metadata) {
    return []
  }

  const composantsByRank = [...(curation?.composants ?? [])].sort(
    (a, b) => a.rank - b.rank
  )
  const resolved: ResolvedFormuleSelectionEntry[] = []
  const matchedComposantKeys = new Set<string>()

  for (const composant of composantsByRank) {
    const value = metadata[formuleSelectionMetadataKey(composant.key)]
    if (typeof value !== "string" || value.length === 0) {
      continue
    }

    matchedComposantKeys.add(composant.key)
    const variant = composant.curatedVariants.find((v) => v.id === value)
    resolved.push({
      composantKey: composant.key,
      label: composant.label,
      variantLabel: variant ? variant.name : value,
    })
  }

  for (const [key, value] of Object.entries(metadata)) {
    const match = key.match(SELECTION_KEY_PATTERN)
    if (!match || typeof value !== "string" || value.length === 0) {
      continue
    }

    const composantKey = match[1]
    if (matchedComposantKeys.has(composantKey)) {
      continue
    }

    resolved.push({ composantKey, label: composantKey, variantLabel: value })
  }

  return resolved
}
