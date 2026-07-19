type Props = {
  title: string
  children: React.ReactNode
  "data-testid"?: string
}

const InfoCard = ({ title, children, "data-testid": dataTestid }: Props) => (
  <div
    className="bg-white border border-stone-200 p-6 rounded-md flex flex-col gap-2"
    data-testid={dataTestid}
  >
    <p className="text-sm font-semibold text-stone-900">{title}</p>
    <p className="text-sm text-stone-600 leading-relaxed">{children}</p>
  </div>
)

export default InfoCard
