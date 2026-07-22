"use client"

import { Dialog, Transition } from "@headlessui/react"
import Image from "next/image"
import { Fragment, useState } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import X from "@modules/common/icons/x"

type ProductImageZoomProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  title: string
}

// Clicking the Carte's product photo used to navigate to the product page
// (ticket 03). That link is gone — the image is now a pure zoom trigger, so
// this owns both the thumbnail button and the enlarged view in one place.
export default function ProductImageZoom({
  thumbnail,
  images,
  title,
}: ProductImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false)
  const fullImage = thumbnail || images?.[0]?.url

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group block w-full text-left"
        aria-label={`Agrandir la photo de ${title}`}
        data-testid="carte-product-image-zoom-trigger"
      >
        <Thumbnail
          thumbnail={thumbnail}
          images={images}
          size="full"
          className="!rounded-none"
        />
      </button>

      {fullImage && (
        <Transition appear show={isOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-[75]"
            onClose={() => setIsOpen(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-[90vw] max-w-3xl h-[80vh]">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="absolute -top-10 right-0 text-white"
                    aria-label="Fermer"
                    data-testid="carte-product-image-zoom-close"
                  >
                    <X size={24} />
                  </button>
                  <Image
                    src={fullImage}
                    alt={title}
                    fill
                    className="object-contain"
                    sizes="90vw"
                  />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      )}
    </>
  )
}
