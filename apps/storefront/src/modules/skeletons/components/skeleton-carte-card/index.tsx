// Placeholder for a whole Carte card while its Curation lookup is in flight
// (docs/specs/commande-depuis-la-page-carte.md, "chaque carte porte sa
// propre frontière de chargement") — shown until we know whether the
// Produit is a Formule, so the shape it settles into (image or Composants)
// is never guessed.
const SkeletonCarteCard = () => {
  return (
    <div className="flex flex-col gap-y-3" data-testid="carte-product-card-skeleton">
      <div className="aspect-square w-full bg-ui-bg-component-pressed rounded-md animate-pulse" />
      <div className="h-4 w-2/3 bg-ui-bg-component-pressed rounded-md animate-pulse" />
      <div className="h-11 w-full bg-ui-bg-component-pressed rounded-md animate-pulse" />
    </div>
  )
}

export default SkeletonCarteCard
