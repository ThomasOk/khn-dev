import Image from "next/image"
import RevealWrapper from "@modules/common/components/reveal-wrapper"

type GalleryImage = {
  src: string
  alt: string
  objectPosition: string
}

const images: GalleryImage[] = [
  {
    src: "/images/kitchen_about.webp",
    alt: "Chef flambant un wok en cuisine",
    objectPosition: "object-[50%_65%]",
  },
  {
    src: "/images/bowl_about.webp",
    alt: "Bols à emporter garnis de nouilles et de beignets",
    objectPosition: "object-[50%_70%]",
  },
  {
    src: "/images/counter_about.webp",
    alt: "Comptoir du restaurant et son mur en faïence bleue",
    objectPosition: "object-[50%_85%]",
  },
  {
    src: "/images/table_about.webp",
    alt: "Salle du restaurant Kim-Hi Noodle dressée",
    objectPosition: "object-[50%_60%]",
  },
  {
    src: "/images/salades_about.webp",
    alt: "Bol de salade de nouilles aux crevettes",
    objectPosition: "object-[50%_55%]",
  },
]

const GallerySection = () => {
  return (
    <section className="bg-khn-cream py-20 small:py-28">
      <div className="content-container">
        <RevealWrapper direction="up">
          <div className="flex flex-col items-center text-center gap-5 mb-16 small:mb-20">
            <p className="text-khn-teal text-sm font-medium uppercase tracking-widest">
              Galerie
            </p>

            <h2 className="font-display uppercase text-4xl small:text-5xl leading-tight text-stone-900">
              Une expérience à partager
            </h2>
          </div>
        </RevealWrapper>

        <RevealWrapper direction="up" delay={150}>
          <div className="grid grid-cols-2 small:grid-cols-3 gap-4 small:gap-6">
            <div className="relative aspect-[3/2] small:aspect-auto small:row-span-2 overflow-hidden">
              <Image
                src={images[0].src}
                alt={images[0].alt}
                fill
                className={`object-cover ${images[0].objectPosition}`}
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            </div>

            {images.slice(1).map((image, index) => (
              <div
                key={image.src}
                className={`relative aspect-[3/2] overflow-hidden ${
                  index === images.length - 2 ? "col-span-2 small:col-span-1" : ""
                }`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className={`object-cover ${image.objectPosition}`}
                  sizes={
                    index === images.length - 2
                      ? "(max-width: 1024px) 100vw, 25vw"
                      : "(max-width: 1024px) 50vw, 25vw"
                  }
                />
              </div>
            ))}
          </div>
        </RevealWrapper>
      </div>
    </section>
  )
}

export default GallerySection
