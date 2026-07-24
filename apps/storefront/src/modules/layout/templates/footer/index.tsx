import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import BackToTop from "./back-to-top"

const openingHours = [
  {
    label: "Sur place",
    schedule: [
      { days: "Lun – Jeu", hours: ["11h30 – 14h00", "18h30 – 21h30"] },
      { days: "Ven – Sam", hours: ["11h30 – 14h00", "18h30 – 22h00"] },
    ],
  },
  {
    label: "À emporter",
    schedule: [
      { days: "Lun – Jeu", hours: ["11h00 – 14h00", "18h00 – 22h00"] },
      { days: "Ven – Sam", hours: ["11h00 – 14h00", "18h00 – 22h30"] },
    ],
  },
]

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

          <div className="grid grid-cols-2 small:grid-cols-12 gap-10 small:gap-10">

            <div className="flex flex-col gap-4 small:col-span-2">
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

            <div className="flex flex-col gap-4 small:col-span-3">
              <p className="text-white text-xs font-semibold uppercase tracking-widest">
                Adresse & Contact
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
              </address>
            </div>

            <div className="col-span-2 small:col-span-4 flex flex-col gap-4">
              <p className="text-white text-xs font-semibold uppercase tracking-widest">
                Horaires
              </p>
              <div className="grid grid-cols-2 gap-8">
                {openingHours.map(({ label, schedule }) => (
                  <div key={label} className="flex flex-col gap-3">
                    <p className="text-orange-500 text-xs font-semibold uppercase tracking-wider">
                      {label}
                    </p>
                    <div className="flex flex-col gap-2.5 text-stone-400 text-sm">
                      {schedule.map(({ days, hours }) => (
                        <div key={days}>
                          <p className="text-stone-300 font-medium">{days}</p>
                          {hours.map((h) => (
                            <p key={h}>{h}</p>
                          ))}
                        </div>
                      ))}
                      <p className="text-stone-500">Dimanche fermé</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 small:col-span-3 flex flex-col gap-4">
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

        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col small:flex-row items-start small:items-center justify-between gap-6">
          <div className="flex flex-col small:flex-row items-start small:items-center gap-2 small:gap-6">
            <p className="text-stone-500 text-sm">
              © {new Date().getFullYear()} Kim-Hi Noodle. Tous droits réservés.
            </p>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { label: "Mentions légales", href: "/legal-notice" },
                { label: "CGV", href: "/terms-of-sale" },
                { label: "Confidentialité", href: "/privacy-policy" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <LocalizedClientLink
                    href={href}
                    className="text-stone-500 text-sm transition-colors duration-200 [@media(hover:hover)]:hover:text-white"
                  >
                    {label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>
          <BackToTop />
        </div>

      </div>
    </footer>
  )
}
