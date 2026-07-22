import Image from "next/image"

const CarteHero = () => {
  return (
    <div className="relative h-56 small:h-80 w-full overflow-hidden">
      <Image
        src="/images/loc_lac.webp"
        alt="Loc lac - Kim-Hi Noodle"
        fill
        className="object-cover object-[50%_55%]"
        priority
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <h1
          className="font-display text-4xl small:text-5xl uppercase tracking-[0.15em] leading-tight text-white"
          data-testid="store-page-title"
        >
          La carte
        </h1>
      </div>
    </div>
  )
}

export default CarteHero
