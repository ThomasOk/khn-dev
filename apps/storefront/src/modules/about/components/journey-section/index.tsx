import { Heart, PaperPlane } from "@medusajs/icons"
import Image from "next/image"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

const NoodleBowlIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <line x1="4" y1="11" x2="20" y2="11" />
    <path d="M4 11c0 4 3.5 7 8 7s8-3 8-7" />
    <line x1="9" y1="9" x2="15" y2="2" />
    <line x1="12" y1="9" x2="18" y2="2" />
  </svg>
)

type Step = {
  number: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  paragraphs: string[]
  image: string
  imageAlt: string
  imageAspect: string
}

const steps: Step[] = [
  {
    number: "01",
    icon: NoodleBowlIcon,
    title: "Battambang, ma ville natale",
    paragraphs: [
      "Tout commença un soir de décembre, je m'installe sur un petit tabouret et commande un bol de nouilles au bœuf dans un restaurant à l'entrée d'une ruelle de Battambang, la cuisine roule à pleine vitesse.",
    ],
    image: "/images/battambang_about.webp",
    imageAlt: "Rue commerçante de Battambang, ville natale de Chetra",
    imageAspect: "aspect-[5/2]",
  },
  {
    number: "02",
    icon: Heart,
    title: "La rencontre",
    paragraphs: [
      "Dans ce bouillonnement, la serveuse assigne à ma table, Rina, une habituée des lieux. Ce simple coup du destin changea la trajectoire de ma vie. Un repas inoubliable.",
    ],
    image: "/images/meeting_about.webp",
    imageAlt: "Chetra et Rina au comptoir du restaurant",
    imageAspect: "aspect-[5/2]",
  },
  {
    number: "03",
    icon: PaperPlane,
    title: "Arrivée en France",
    paragraphs: [
      "Arrivé en France avec Rina à mes côtés, notre amour pour les nouilles nous motive à travailler dans les restaurants aux saveurs asiatiques.",
    ],
    image: "/images/arrived_about.webp",
    imageAlt: "Chetra en cuisine, préparant un bouillon de nouilles",
    imageAspect: "aspect-[5/2]",
  },
  {
    number: "04",
    icon: NoodleBowlIcon,
    title: "Kim-Hi Noodle aujourd'hui",
    paragraphs: [
      "Aujourd'hui, chaque fois que je pense aux nouilles au bœuf à Battambang, mon bol de nouilles reste agréable et réconfortant. Le goût de la nostalgie me rappelle toujours ma ville, les nombreuses histoires vécues, mais par-dessus tout, cette soirée avec Rina.",
      "Avec le temps, le dessin de la vieille ruelle dans ma mémoire se dissipe, mais le goût de mon bol de nouilles reste persistant encore sur la langue. Tous les hivers, nous cuisinons différents plats de nouilles, rôles centraux de nos balbutiements amoureux.",
      "Ce bol de nouilles a conservé les histoires de ma ville natale avec Rina pendant de nombreuses années, et c'est dans cet esprit que nous avons ouvert avec Rina, Kim-Hi Noodle, comme si, tous ces souvenirs et la symbolique menaient inévitablement à un but commun : celui d'ouvrir notre restaurant de nouilles et vous transmettre notre histoire.",
    ],
    image: "/images/restaurant_about.webp",
    imageAlt: "Façade du restaurant Kim-Hi Noodle à Castelnau-le-Lez",
    imageAspect: "aspect-[5/4]",
  },
]

const StepImage = ({ step }: { step: Step }) => (
  <div
    className={`relative w-full ${step.imageAspect} overflow-hidden rounded-large`}
  >
    <Image
      src={step.image}
      alt={step.imageAlt}
      fill
      className="object-cover object-center"
      sizes="(max-width: 1024px) 100vw, 50vw"
    />
  </div>
)

const StepText = ({ step }: { step: Step }) => {
  const Icon = step.icon

  return (
    <div className="bg-khn-teal-panel rounded-large p-8 small:p-10 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex small:hidden h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/30">
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="flex flex-1 min-w-0 flex-col gap-1 small:gap-2">
          <span className="font-display text-2xl text-khn-gold">
            {step.number}
          </span>
          <h3 className="font-display text-2xl small:text-3xl leading-snug text-white">
            {step.title}
          </h3>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {step.paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 24)}
            className="text-white/75 text-sm small:text-base leading-relaxed"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}

const JourneySection = () => {
  return (
    <section className="relative bg-khn-teal bg-[url('/images/pattern_bg.png')] bg-repeat bg-[length:1400px_auto] py-20 small:py-28">
      <div className="content-container">
        <div className="relative flex flex-col gap-16 small:gap-24">
          <span className="hidden small:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/15" />

          {steps.map((step, index) => {
            const Icon = step.icon
            const imageFirst = index % 2 === 0

            return (
              <div key={step.number} className="relative">
                <div className="hidden small:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-khn-teal">
                  <Icon className="h-7 w-7 text-white" />
                </div>

                <div className="grid grid-cols-1 small:grid-cols-2 gap-y-8 gap-x-8 small:gap-x-28 items-center">
                  <RevealWrapper
                    direction={imageFirst ? "left" : "right"}
                    className={imageFirst ? "" : "small:order-2"}
                  >
                    <StepImage step={step} />
                  </RevealWrapper>
                  <RevealWrapper
                    direction={imageFirst ? "right" : "left"}
                    delay={150}
                    className={imageFirst ? "" : "small:order-1"}
                  >
                    <StepText step={step} />
                  </RevealWrapper>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default JourneySection
