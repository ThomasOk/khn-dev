import { Envelope, MapPin, Phone } from "@medusajs/icons"
import Image from "next/image"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

type ContactItem = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  content: React.ReactNode
}

const contactItems: ContactItem[] = [
  {
    icon: MapPin,
    label: "Adresse",
    content: (
      <>
        <p>652 Avenue de l&apos;Europe</p>
        <p>34170 Castelnau-le-Lez</p>
      </>
    ),
  },
  {
    icon: Phone,
    label: "Téléphone",
    content: (
      <a
        href="tel:0973896013"
        className="transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
      >
        09 73 89 60 13
      </a>
    ),
  },
  {
    icon: Envelope,
    label: "Email",
    content: (
      <a
        href="mailto:contact@kim-hi-noodle.fr"
        className="transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
      >
        contact@kim-hi-noodle.fr
      </a>
    ),
  },
]

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/kimhi.noodle/" },
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=100087027908126" },
]

const CoordinatesSection = () => {
  return (
    <section className="bg-khn-cream py-20 small:py-28">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-2 gap-16 small:gap-20 items-center">
          <RevealWrapper direction="left">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-5">
                <p className="text-khn-gold text-sm font-medium uppercase tracking-widest">
                  Nous contacter
                </p>

                <h2 className="font-display text-4xl small:text-5xl leading-tight text-stone-900">
                  Coordonnées
                </h2>

                <span className="h-0.5 w-14 bg-khn-gold" />
              </div>

              <div className="flex flex-col">
                {contactItems.map((item, index) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.label}
                      className={`flex items-start gap-5 py-6 ${
                        index > 0 ? "border-t border-stone-200" : "pt-0"
                      }`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-khn-cream-hover">
                        <Icon className="h-5 w-5 text-khn-teal" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-khn-teal text-xs font-semibold uppercase tracking-wide">
                          {item.label}
                        </p>
                        <div className="text-stone-600 text-base leading-relaxed">
                          {item.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-4">
                <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">
                  Réseaux
                </p>
                <div className="flex items-center gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-2 rounded-full border border-khn-teal/40 text-khn-teal text-xs font-medium uppercase tracking-wide transition-colors duration-200 [@media(hover:hover)]:hover:bg-khn-teal [@media(hover:hover)]:hover:text-white"
                    >
                      {social.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </RevealWrapper>

          <RevealWrapper direction="right" delay={150}>
            <div className="relative">
              <span className="absolute -top-5 -right-5 h-full w-full rounded-lg border border-khn-gold/60" />
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                <Image
                  src="/images/restaurant_about.webp"
                  alt="Façade du restaurant Kim-Hi Noodle à Castelnau-le-Lez"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  )
}

export default CoordinatesSection
