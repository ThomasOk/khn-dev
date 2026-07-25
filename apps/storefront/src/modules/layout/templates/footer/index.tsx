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

          <LocalizedClientLink href="/" className="shrink-0 self-center small:self-auto">
            <Image
              src="/images/khn_logo.png"
              alt="Kim-Hi Noodle"
              width={0}
              height={0}
              sizes="160px"
              className="h-8 small:h-10 w-auto"
            />
          </LocalizedClientLink>

          <div className="grid grid-cols-1 small:grid-cols-12 gap-10 small:gap-10">

            <div className="flex flex-col items-center text-center small:items-start small:text-left gap-4 small:col-span-2">
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

            <div className="flex flex-col items-center text-center small:items-start small:text-left gap-4 small:col-span-3">
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

            <div className="small:col-span-4 flex flex-col items-center text-center small:items-start small:text-left gap-4">
              <p className="text-white text-xs font-semibold uppercase tracking-widest">
                Horaires
              </p>
              <div className="grid grid-cols-1 small:grid-cols-2 gap-8">
                {openingHours.map(({ label, schedule }) => (
                  <div key={label} className="flex flex-col gap-3">
                    <p className="text-khn-gold text-xs font-semibold uppercase tracking-wider">
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

            <div className="small:col-span-3 flex flex-col items-center text-center small:items-start small:text-left gap-4">
              <p className="text-white text-xs font-semibold uppercase tracking-widest">
                Nous suivre
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.facebook.com/profile.php?id=100087027908126"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-stone-700 text-stone-400 transition-colors duration-200 [@media(hover:hover)]:hover:border-white [@media(hover:hover)]:hover:text-white"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/kimhi.noodle/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-stone-700 text-stone-400 transition-colors duration-200 [@media(hover:hover)]:hover:border-white [@media(hover:hover)]:hover:text-white"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
              </div>
            </div>

          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col items-center text-center small:flex-row small:items-center small:text-left justify-between gap-6">
          <div className="flex flex-col items-center small:flex-row small:items-center gap-2 small:gap-6">
            <p className="text-stone-500 text-sm">
              © {new Date().getFullYear()} Kim-Hi Noodle. Tous droits réservés.
            </p>
            <ul className="flex flex-wrap items-center justify-center small:justify-start gap-x-6 gap-y-2">
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
