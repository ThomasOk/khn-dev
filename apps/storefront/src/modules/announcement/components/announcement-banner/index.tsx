"use client"

import { useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Modal from "@modules/common/components/modal"

type AnnouncementBannerProps = {
  headline: string
  body: string | null
  linkLabel: string | null
  linkUrl: string | null
}

const LINK_BUTTON_CLASSES =
  "inline-flex h-10 items-center justify-center rounded-md bg-black px-4 font-medium text-white transition-colors hover:bg-gray-800"

// The Annonce bandeau: text only unless there is a corps or a lien to open —
// clickable if and only if one of those is present (ADR 0009's glossary: the
// bandeau itself is not closable, and this component never navigates on its
// own, it only ever opens the panel). role="status" because it informs, it
// does not interrupt.
export default function AnnouncementBanner({
  headline,
  body,
  linkLabel,
  linkUrl,
}: AnnouncementBannerProps) {
  const [open, setOpen] = useState(false)
  const clickable = !!body || !!linkUrl

  return (
    <div role="status" className="bg-[#121212] text-white">
      <div className="content-container py-2 text-center text-sm">
        {clickable ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mx-auto max-w-2xl underline decoration-white/40 underline-offset-2 hover:decoration-white"
          >
            {headline}
          </button>
        ) : (
          <p className="mx-auto max-w-2xl">{headline}</p>
        )}
      </div>

      {clickable && (
        <Modal isOpen={open} close={() => setOpen(false)} size="small">
          <Modal.Title>{headline}</Modal.Title>
          {body && (
            <Modal.Body>
              {/* Plain text — never dangerouslySetInnerHTML. whitespace-pre-line
                  preserves the paragraph breaks the restaurateur typed without
                  parsing the body as markup. */}
              <div className="w-full text-left whitespace-pre-line text-small-regular text-ui-fg-base">
                {body}
              </div>
            </Modal.Body>
          )}
          {linkLabel && linkUrl && (
            <Modal.Footer>
              <AnnouncementLink label={linkLabel} url={linkUrl} />
            </Modal.Footer>
          )}
        </Modal>
      )}
    </div>
  )
}

function AnnouncementLink({ label, url }: { label: string; url: string }) {
  if (url.startsWith("/")) {
    return (
      <LocalizedClientLink href={url} className={LINK_BUTTON_CLASSES}>
        {label}
      </LocalizedClientLink>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK_BUTTON_CLASSES}
    >
      {label}
    </a>
  )
}
