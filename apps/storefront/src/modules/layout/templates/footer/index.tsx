import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function Footer() {
  return (
    <footer className="bg-stone-900 border-t border-stone-800 w-full">
      <div className="content-container py-16 small:py-20">

        <div className="flex flex-col gap-12 small:flex-row small:justify-between small:items-start">

          <LocalizedClientLink href="/" className="shrink-0">
            <Image
              src="/images/khn_logo.png"
              alt="Kim-Hi Noodle"
              width={0}
              height={0}
              sizes="160px"
              className="h-10 w-auto brightness-0 invert"
            />
          </LocalizedClientLink>

          <div className="grid grid-cols-2 small:grid-cols-3 gap-10 small:gap-16">

            <div className="flex flex-col gap-4">
              <p className="text-white text-xs font-semibold uppercase tracking-widest">
                Navigation
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  { label: "La carte", href: "/store" },
                  { label: "Notre histoire", href: "/#histoire" },
                  { label: "Commander", href: "/store" },
                  { label: "Contact", href: "/contact" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <LocalizedClientLink
                      href={href}
                      className="text-stone-400 text-sm transition-colors duration-200 [@media(hover:hover)]:hover:text-white"
                    >
                      {label}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-white text-xs font-semibold uppercase tracking-widest">
                Le restaurant
              </p>
              <address className="not-italic flex flex-col gap-3 text-stone-400 text-sm">
                <span>
                  652 Avenue de l&apos;Europe
                  <br />
                  34170 Castelnau-le-Lez
                </span>
                <a
                  href="tel:0973896013"
                  className="transition-colors duration-200 [@media(hover:hover)]:hover:text-white"
                >
                  09 73 89 60 13
                </a>
                <a
                  href="mailto:contact@kim-hi-noodle.fr"
                  className="transition-colors duration-200 [@media(hover:hover)]:hover:text-white"
                >
                  contact@kim-hi-noodle.fr
                </a>
                <span>
                  Lun – Sam 11h30
                  <br />
                  Dimanche fermé
                </span>
              </address>
            </div>

            <div className="col-span-2 small:col-span-1 flex flex-col gap-4">
              <p className="text-white text-xs font-semibold uppercase tracking-widest">
                Nous suivre
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  { label: "Instagram", href: "https://instagram.com/kimhinoodle" },
                  { label: "Facebook", href: "https://facebook.com/kimhinoodle" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 text-sm transition-colors duration-200 [@media(hover:hover)]:hover:text-white"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-800">
          <p className="text-stone-500 text-sm">
            © {new Date().getFullYear()} Kim-Hi Noodle. Tous droits réservés.
          </p>
        </div>

      </div>
    </footer>
  )
}
