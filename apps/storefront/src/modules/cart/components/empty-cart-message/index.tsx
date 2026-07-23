import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div className="py-48 px-2 flex flex-col justify-center items-start" data-testid="empty-cart-message">
      <Heading
        level="h1"
        className="font-display text-2xl uppercase tracking-[0.06em] text-neutral-900"
      >
        Panier
      </Heading>
      <Text className="text-neutral-600 mt-4 mb-6 max-w-[32rem]">
        Votre panier est vide. Ajoutez un plat depuis la carte pour commencer
        votre commande.
      </Text>
      <div>
        <InteractiveLink href="/store">Découvrir la carte</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
