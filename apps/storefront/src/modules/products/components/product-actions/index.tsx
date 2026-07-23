"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button, clx } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  // Defaults to true: the dedicated product page is alone on its page and
  // keeps its shareable link to a specific Variante (User Story 34). The
  // Carte turns it off — N instances on the same URL would otherwise
  // overwrite each other (User Story 33).
  syncVariantWithUrl?: boolean
  // Defaults to true: only the dedicated product page needs it. The Carte
  // turns it off — the persistent cart bar (ticket 07) already occupies
  // that spot.
  showMobileActions?: boolean
  // Defaults to true. The Carte turns it off — the card shows the price
  // next to the product title instead (see CartePlatCard).
  showPrice?: boolean
  // Extra classes merged onto the add-to-cart Button, after its own
  // defaults — lets a caller like the Carte's cards adjust cosmetics
  // (e.g. corner radius) without a second copy of this component.
  buttonClassName?: string
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
  syncVariantWithUrl = true,
  showMobileActions = true,
  showPrice = true,
  buttonClassName,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  // Preselect the first Variante's options, so a card never opens on an
  // empty picker (the client can always add straight away and change their
  // mind after).
  useEffect(() => {
    if (product.variants?.length) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  // Restore the Variante from the URL on mount, so a shared link lands on
  // the Variante it points to instead of an unselected picker.
  useEffect(() => {
    if (!syncVariantWithUrl) {
      return
    }

    const variantId = searchParams.get("v_id")
    if (!variantId) {
      return
    }

    const variant = product.variants?.find((v) => v.id === variantId)
    if (!variant) {
      return
    }

    setOptions(optionsAsKeymap(variant.options) ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    if (!syncVariantWithUrl) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant, syncVariantWithUrl])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    })

    setIsAdding(false)
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        {/* Reserved even when this Produit has nothing to choose, so its
            add-to-cart button lines up with the Variante selector of a
            neighbouring card in the same Carte row instead of landing next
            to that neighbour's description. */}
        <div className="min-h-[4.25rem]">
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        {showPrice && <ProductPrice product={product} variant={selectedVariant} />}

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="accent"
          className={clx(
            "w-full h-11 uppercase text-xs tracking-[0.15em] !rounded-base",
            buttonClassName
          )}
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {!selectedVariant && !options
            ? "Sélectionnez une variante"
            : !inStock || !isValidVariant
            ? "Rupture de stock"
            : "Ajouter au panier"}
        </Button>
        {showMobileActions && (
          <MobileActions
            product={product}
            variant={selectedVariant}
            options={options}
            updateOptions={setOptionValue}
            inStock={inStock}
            handleAddToCart={handleAddToCart}
            isAdding={isAdding}
            show={!inView}
            optionsDisabled={!!disabled || isAdding}
          />
        )}
      </div>
    </>
  )
}
