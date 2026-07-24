type Props = {
  children: React.ReactNode
}

export default function Pending({ children }: Props) {
  return (
    <span className="inline bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
      {children}
    </span>
  )
}
