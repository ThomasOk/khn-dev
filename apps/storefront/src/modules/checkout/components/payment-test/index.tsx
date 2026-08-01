import { Badge } from "@modules/common/components/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">Attention :</span> à des fins de test
      uniquement.
    </Badge>
  )
}

export default PaymentTest
