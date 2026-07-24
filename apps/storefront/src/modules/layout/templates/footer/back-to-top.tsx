"use client"

export default function BackToTop() {
  const handleClick = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Retour en haut de page"
      className="shrink-0 flex items-center justify-center h-11 w-11 rounded-full border border-stone-700 text-stone-400 transition-colors duration-200 [@media(hover:hover)]:hover:border-stone-500 [@media(hover:hover)]:hover:text-white"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 13V3M3 7l5-5 5 5" />
      </svg>
    </button>
  )
}
