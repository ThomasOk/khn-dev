"use client"

import { useScrollReveal } from "@modules/common/hooks/use-scroll-reveal"

type RevealDirection = "up" | "left" | "right"

type Props = {
  children: React.ReactNode
  direction?: RevealDirection
  delay?: number
  className?: string
}

const directionClass: Record<RevealDirection, string> = {
  up: "reveal",
  left: "reveal-left",
  right: "reveal-right",
}

const RevealWrapper = ({ children, direction = "up", delay = 0, className = "" }: Props) => {
  const { ref, state } = useScrollReveal<HTMLDivElement>()

  const revealClass = state !== "init" ? directionClass[direction] : ""
  const visibleClass = state === "visible" ? "reveal-visible" : ""

  return (
    <div
      ref={ref}
      className={`${revealClass} ${visibleClass} ${className}`.trim()}
      style={delay && state !== "init" ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

export default RevealWrapper
