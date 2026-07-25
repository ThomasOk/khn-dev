type AnnouncementBannerProps = {
  headline: string
}

// The Annonce bandeau: text only, never a link or a button — it is inert by
// design (ADR 0009's glossary: not closable, not clickable, and this is not
// an oversight). role="status" because it informs, it does not interrupt.
export default function AnnouncementBanner({
  headline,
}: AnnouncementBannerProps) {
  return (
    <div role="status" className="bg-[#121212] text-white">
      <div className="content-container py-2 text-center text-sm">
        <p className="mx-auto max-w-2xl">{headline}</p>
      </div>
    </div>
  )
}
