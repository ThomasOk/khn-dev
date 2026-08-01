import { DocumentText } from "@medusajs/icons"

const DineInMenuBanner = () => {
  return (
    <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-lg border border-khn-gold/25 bg-khn-gold/10">
      <DocumentText className="shrink-0 mt-0.5 text-khn-gold-dark" />
      <div className="flex flex-col gap-1 text-sm text-neutral-700">
        <p>
          Vous êtes sur place ? Nous avons une carte dédiée.{" "}
          <a
            href="/documents/KHN-carte-menu-boissons-allergenes-2026.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-khn-gold-dark underline underline-offset-2 [@media(hover:hover)]:hover:text-khn-gold-dark/70"
          >
            Consulter (PDF)
          </a>
        </p>
        <p>
          Liste des allergènes de notre carte :{" "}
          <a
            href="/documents/KHN-allergenes-2026.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-khn-gold-dark underline underline-offset-2 [@media(hover:hover)]:hover:text-khn-gold-dark/70"
          >
            Consulter (PDF)
          </a>
        </p>
      </div>
    </div>
  )
}

export default DineInMenuBanner
