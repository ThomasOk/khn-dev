import InteractiveLink from "@modules/common/components/interactive-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page introuvable — Kim-Hi Noodle",
  description: "La page demandée n'existe pas.",
}

export default async function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">Page introuvable</h1>
      <p className="text-small-regular text-ui-fg-base">
        La page que vous cherchez n'existe pas.
      </p>
      <InteractiveLink href="/">Retour à l'accueil</InteractiveLink>
    </div>
  )
}
