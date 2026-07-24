type Props = {
  title: string
  children: React.ReactNode
  "data-testid"?: string
  // Drops the card's own bg/border/padding for use inside a surface that
  // already provides them (e.g. the reservation form's white cards) — kept
  // as the default's opt-in rather than the other way round since
  // cancel-reservation renders InfoCard standalone.
  flat?: boolean
}

const InfoCard = ({
  title,
  children,
  "data-testid": dataTestid,
  flat = false,
}: Props) => (
  <div
    className={
      flat
        ? "flex flex-col gap-2"
        : "bg-white border border-stone-200 p-6 rounded-md flex flex-col gap-2"
    }
    data-testid={dataTestid}
  >
    <p className="text-sm font-semibold text-stone-900">{title}</p>
    <p className="text-sm text-stone-600 leading-relaxed">{children}</p>
  </div>
)

export default InfoCard
