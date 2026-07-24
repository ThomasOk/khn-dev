type Props = {
  title: string
  children: React.ReactNode
}

export default function LegalSection({ title, children }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-stone-900 font-semibold text-lg small:text-xl pb-3 border-b border-stone-200">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-stone-600 text-sm small:text-base leading-relaxed">
        {children}
      </div>
    </section>
  )
}
