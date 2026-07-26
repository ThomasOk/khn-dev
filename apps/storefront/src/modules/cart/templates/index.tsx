import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import ShowcaseNotice from "@modules/showcase/components/showcase-notice"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
  orderPossible,
  showcaseNote,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  orderPossible: boolean
  showcaseNote: string | null
}) => {
  return (
    <div className="bg-[#F7F3F0] py-12">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            <div className="flex flex-col bg-white border border-neutral-200 shadow-sm px-6 py-6 gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {showcaseNote && <ShowcaseNotice note={showcaseNote} />}
                {cart && cart.region && (
                  <>
                    <div className="bg-white border border-neutral-200 shadow-sm px-6 py-6">
                      <Summary cart={cart} orderPossible={orderPossible} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-y-8">
            {showcaseNote && <ShowcaseNotice note={showcaseNote} />}
            <EmptyCartMessage orderPossible={orderPossible} />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
