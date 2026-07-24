type Props = {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, lastUpdated, children }: Props) {
  return (
    <div className="min-h-screen">
      <div className="bg-stone-900 pt-32 pb-20 small:pt-40 small:pb-28">
        <div className="content-container flex flex-col items-center text-center gap-4">
          <p className="text-orange-500 text-sm font-medium uppercase tracking-widest">
            Kim-Hi Noodle
          </p>
          <h1 className="font-display text-4xl small:text-6xl text-white leading-tight">
            {title}
          </h1>
          <p className="text-stone-400 text-sm">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>
      </div>

      <div className="bg-khn-cream py-20 small:py-28">
        <div className="content-container">
          <div className="max-w-3xl mx-auto flex flex-col gap-14">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
