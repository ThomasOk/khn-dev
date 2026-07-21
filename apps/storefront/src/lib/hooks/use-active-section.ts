import { useEffect, useState } from "react"

// Scrollspy for the Carte's section nav: picks the topmost section whose
// heading has scrolled past the sticky bars (nav + section nav), so the
// highlighted anchor always matches what the client is actually reading.
export const useActiveSection = (ids: string[], rootMargin: string) => {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null)

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)

        if (visible.length === 0) {
          return
        }

        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        )

        setActiveId(topmost.target.id)
      },
      { rootMargin, threshold: 0 }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [ids, rootMargin])

  return activeId
}
