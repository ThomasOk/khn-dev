import { DocumentText } from "@medusajs/icons"

const DineInMenuBanner = () => {
  return (
    <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg border border-orange-200 bg-orange-50">
      <DocumentText className="shrink-0 text-orange-600" />
      <p className="text-sm text-neutral-700">
        Vous êtes sur place ? Notre carte du restaurant propose un choix plus
        large et des tarifs différents de la commande en ligne.{" "}
        <a
          href="/documents/KHN-carte-menu-boissons-allergenes-2026.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-orange-600 underline underline-offset-2 [@media(hover:hover)]:hover:text-orange-700"
        >
          Consulter la carte sur place (PDF)
        </a>
      </p>
    </div>
  )
}

export default DineInMenuBanner
