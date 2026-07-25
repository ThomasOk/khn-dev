import Image from "next/image"

const ContactHero = () => {
  return (
    <div className="relative w-full overflow-hidden">
      <Image
        src="/images/khn-reservations.webp"
        alt="Salle du restaurant Kim-Hi Noodle"
        fill
        className="object-cover object-[50%_60%]"
        priority
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 content-container flex flex-col items-center text-center gap-5 pt-32 pb-20 small:pt-40 small:pb-28">
        <Image
          src="/images/khn-swirl-mark.png"
          alt=""
          aria-hidden="true"
          width={122}
          height={117}
          className="h-10 w-auto small:h-12 opacity-90"
        />

        <h1
          className="font-display text-4xl small:text-6xl leading-tight text-white"
          data-testid="contact-page-title"
        >
          Contact
        </h1>

        <span className="h-0.5 w-14 bg-khn-gold" />

        <p className="text-sm small:text-base text-white/80 max-w-md [text-wrap:balance]">
          Une question, une réservation ou une envie de déguster nos
          spécialités ? Notre équipe est à votre écoute.
        </p>
      </div>
    </div>
  )
}

export default ContactHero
