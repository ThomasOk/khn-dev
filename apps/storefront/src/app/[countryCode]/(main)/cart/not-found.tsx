import { Metadata } from "next"

import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "Panier introuvable — Kim-Hi Noodle",
  description: "Le panier demandé n'existe pas.",
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">Panier introuvable</h1>
      <p className="text-small-regular text-ui-fg-base">
        Le panier que vous essayez d'ouvrir n'existe plus. Videz vos cookies et
        réessayez.
      </p>
      <InteractiveLink href="/">Retour à l'accueil</InteractiveLink>
    </div>
  )
}
