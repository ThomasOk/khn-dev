"use client"

import { useEffect, useRef, useState } from "react"

type RevealState = "init" | "hidden" | "visible"

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T>(null)
  const [state, setState] = useState<RevealState>("init")

  useEffect(() => {
    const el = ref.current
    if (!el) return

    setState("hidden")

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible")
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px", ...options }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, state, isVisible: state === "visible" }
}
