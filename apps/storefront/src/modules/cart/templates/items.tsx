import repeat from "@lib/util/repeat"
import { getCartFormuleSelections } from "@lib/data/formules"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"
import FormuleSelectionError from "@modules/cart/components/formule-selection-error"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = async ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items
  const formuleSelections = cart ? await getCartFormuleSelections(cart) : {}
  return (
    <div>
      <div className="pb-3 flex items-center">
        <Heading className="font-display text-2xl uppercase tracking-[0.06em] text-neutral-900">
          Panier
        </Heading>
      </div>
      <FormuleSelectionError />
      <Table>
        <Table.Header className="border-t-0">
          <Table.Row className="text-ui-fg-subtle txt-medium-plus">
            <Table.HeaderCell className="!pl-0">Produit</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
            <Table.HeaderCell>Quantité</Table.HeaderCell>
            <Table.HeaderCell className="hidden small:table-cell">
              Prix
            </Table.HeaderCell>
            <Table.HeaderCell className="!pr-0 text-right">
              Total
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => {
                  return (
                    <Item
                      key={item.id}
                      item={item}
                      currencyCode={cart?.currency_code}
                      formuleSelection={formuleSelections[item.id]}
                    />
                  )
                })
            : repeat(5).map((i) => {
                return <SkeletonLineItem key={i} />
              })}
        </Table.Body>
      </Table>
    </div>
  )
}

export default ItemsTemplate
