type Props = {
  phone: string
}

const PhoneLink = ({ phone }: Props) => (
  <a href={`tel:${phone}`} className="font-medium text-stone-900 underline">
    {phone}
  </a>
)

export default PhoneLink
