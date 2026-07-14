# Medusa 2.x : le retrait en magasin et le stockage du Créneau de retrait

**Date** : 2026-07-14
**Version vérifiée** : Medusa **2.16.0** (`apps/backend/package.json`)
**Statut** : recherche — aucune décision prise. La section « Recommandation » est écrite pour être convertie en ADR.

## La question

Comment Medusa 2.x modélise-t-il le retrait en magasin (*store pickup*), et **où faut-il écrire le Créneau de retrait choisi par le client** (date + tranche horaire) pour qu'il survive au passage panier → commande, soit visible en admin, et soit interrogeable par la cuisine (« toutes les commandes du créneau 12h15 ») ?

## Convention de citation

Les paquets Medusa sont installés via pnpm et résolus dans `node_modules/.pnpm/@medusajs+<pkg>@2.16.0_<hash>/node_modules/@medusajs/<pkg>/`. Pour ne pas rendre ce document illisible, les citations sont notées **`@medusajs/<pkg> → dist/chemin.js:ligne`**. Les paquets ne publient que du `dist` compilé (pas de `src`), sauf `@medusajs/dashboard` qui publie aussi `src` (TSX lisible) — les citations dashboard pointent donc sur `src`.

Tout ce qui est affirmé ici sans citation est soit une évidence, soit signalé comme **non vérifié**.

---

## 1. Ce que Medusa donne nativement : le **lieu** de retrait

### 1.1 La chaîne de modèles

Medusa ne connaît pas le mot « pickup » dans son noyau. Il connaît une chaîne générique :

```
Stock Location ──(module link)── Fulfillment Set (type: text)
                                       │
                                       └── Service Zone ──┬── Geo Zone
                                                          └── Shipping Option ── Shipping Option Type (code)
                                                                              └── Fulfillment Provider
```

Le point décisif : **`fulfillment_set.type` est une simple colonne texte, sans enum ni contrainte.**

```js
// @medusajs/fulfillment → dist/models/fulfillment-set.js:6-15
exports.FulfillmentSet = model.define("fulfillment_set", {
    id: model.id({ prefix: "fuset" }).primaryKey(),
    name: model.text(),
    type: model.text(),            // ← aucune contrainte, aucune enum
    service_zones: model.hasMany(...),
    metadata: model.json().nullable(),
})
```

Il n'existe **aucune** `FulfillmentSetType` exportée depuis `@medusajs/utils` (grep infructueux sur `dist/`). La seule enum qui existe est **locale au dashboard admin** :

```ts
// @medusajs/dashboard → src/routes/locations/common/constants.ts:1-4
export enum FulfillmentSetType {
  Shipping = "shipping",
  Pickup = "pickup",
}
```

**Conséquence, et c'est un piège** : `"pickup"` est une **convention partagée entre l'admin UI et le storefront starter**, pas une garantie du framework. La doc officielle des concepts fulfillment donne d'ailleurs l'exemple `type: "pick-up"` (avec tiret) — [docs.medusajs.com/resources/commerce-modules/fulfillment/concepts](https://docs.medusajs.com/resources/commerce-modules/fulfillment/concepts). **Si le seed écrit `"pick-up"`, l'admin ne reconnaîtra pas le set comme un set de retrait et le filtre du storefront (`=== "pickup"`) ne matchera rien.** La chaîne exacte à écrire est **`"pickup"`**.

`price_type` est en revanche une vraie enum :

```js
// @medusajs/utils → dist/fulfillment/shipping-options.js:6-7
ShippingOptionPriceType["CALCULATED"] = "calculated";
ShippingOptionPriceType["FLAT"] = "flat";
```

et `shipping_option.price_type` a `flat` par défaut (`@medusajs/fulfillment → dist/models/shipping-option.js:15-17`).

### 1.2 Configuration via l'Admin UI

Dans *Settings → Locations*, chaque Stock Location affiche deux cartes, « Shipping » et « Pick up », pilotées par `FulfillmentSetType` (`@medusajs/dashboard → src/routes/locations/location-detail/components/location-general-section/location-general-section.tsx:83-85`). Activer « Pick up » crée un fulfillment set `type: "pickup"`, puis on y ajoute une Service Zone et des Shipping Options.

Le formulaire de création d'option de retrait **masque le sélecteur `price_type`** quand le set est de type pickup (`.../create-shipping-options-form/create-shipping-option-details-form.tsx:100` : `{!isPickup && (`), donc l'option reste sur la valeur par défaut du formulaire, `flat` (`create-shipping-options-form.tsx:60`). **Une option de retrait est donc toujours `price_type: "flat"`** — et son prix sera 0 €.

Le formulaire pose systématiquement deux règles :

```ts
// @medusajs/dashboard → .../create-shipping-options-form.tsx:161-170
rules: [
  { value: isReturn ? "true" : "false", attribute: "is_return",        operator: "eq" },
  { value: data.enabled_in_store ? "true" : "false", attribute: "enabled_in_store", operator: "eq" },
]
```

`enabled_in_store: "true"` est **obligatoire** : sans elle, l'option n'apparaîtra jamais dans le storefront (voir §1.4).

### 1.3 Configuration programmatique (seed)

Le seed actuel du repo crée un set **de livraison** (starter par défaut) :

```ts
// apps/backend/src/scripts/seed.ts (anciennement migration-scripts/initial-data-seed.ts:189-227)
const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
  name: "European Warehouse delivery",
  type: "shipping",                      // ← à remplacer par "pickup"
  service_zones: [{ name: "Europe", geo_zones: [ /* gb, de, dk, se, fr, es, it */ ] }],
})
```

puis le lie au stock location (`:229-236`) et crée les options via `createShippingOptionsWorkflow` (`:238-277`), avec `price_type: "flat"`, `provider_id: "manual_manual"`, un `type: { label, description, code }` inline et les deux règles ci-dessus.

Pour KHN, la forme cible est la même en changeant `type` et en réduisant la geo zone à `fr` :

```ts
const pickupSet = await fulfillmentModuleService.createFulfillmentSets({
  name: "Retrait au restaurant",
  type: "pickup",                                    // chaîne exacte, cf. §1.1
  service_zones: [{
    name: "Retrait sur place",
    geo_zones: [{ country_code: "fr", type: "country" }],   // ← non facultatif, cf. §1.4
  }],
})

await link.create({
  [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
  [Modules.FULFILLMENT]:    { fulfillment_set_id: pickupSet.id },
})

await createShippingOptionsWorkflow(container).run({
  input: [{
    name: "Retrait au restaurant",
    price_type: "flat",                              // toujours flat pour un pickup
    provider_id: "manual_manual",                    // cf. §1.5
    service_zone_id: pickupSet.service_zones[0].id,
    shipping_profile_id: shippingProfile.id,
    type: { label: "Retrait", description: "Retrait au comptoir", code: "pickup" },
    prices: [{ currency_code: "eur", amount: 0 }, { region_id: region.id, amount: 0 }],
    rules: [
      { attribute: "enabled_in_store", value: "true",  operator: "eq" },
      { attribute: "is_return",        value: "false", operator: "eq" },
    ],
  }],
})
```

Note sur `type` vs `type_id` : le validateur admin impose **exactement l'un des deux** —

```js
// @medusajs/medusa → dist/api/admin/shipping-options/validators.js:99-108
type:    AdminCreateShippingOptionTypeObject.optional(),
type_id: z.string().optional(),
...
.refine((data) => isDefined(data.type_id) !== isDefined(data.type), {
    message: "Exactly one of 'type' or 'type_id' must be provided, but not both",
})
```

Le `type.code` (`@medusajs/fulfillment → dist/models/shipping-option-type.js:10`) est **libre** — Medusa ne l'interprète nulle part. Il n'a de sens que pour vous. `"pickup"` est un choix lisible, mais rien ne l'impose.

### 1.4 Comment une option de retrait remonte jusqu'au storefront

C'est `listShippingOptionsForCartWorkflow` qui répond à `GET /store/shipping-options?cart_id=…` (`@medusajs/medusa → dist/api/store/shipping-options/route.js:5-15`). Sa résolution est **entièrement pilotée par le sales channel du panier** :

```js
// @medusajs/core-flows → dist/cart/workflows/list-shipping-options-for-cart.js:136-162
useQueryGraphStep({
    entity: "sales_channels",
    filters: { id: cart.sales_channel_id },
    fields: ["stock_locations.fulfillment_sets.id", "stock_locations.id", ...],
})
// → fulfillmentSetIds
```

puis filtrées par l'adresse du panier :

```js
// .../list-shipping-options-for-cart.js:199-207
filters: {
    fulfillment_set_id: fulfillmentSetIds,
    address: {
        country_code:      cart.shipping_address?.country_code,
        province_code:     cart.shipping_address?.province,
        city:              cart.shipping_address?.city,
        postal_expression: cart.shipping_address?.postal_code,
    },
},
```

**Trois conditions non négociables**, toutes vérifiées ci-dessus, pour qu'une option de retrait apparaisse :

1. le **stock location doit être lié au sales channel** du panier (sinon `fulfillmentSetIds` est vide) ;
2. la service zone du set pickup doit avoir une **geo zone qui matche le `country_code` de la `shipping_address` du panier** — autrement dit, **même un set de retrait a besoin d'une geo zone**, et le panier a besoin d'une adresse. Chez KHN l'« Adresse de facturation » vit dans `shipping_address` (CONTEXT.md § *Adresse de facturation*), donc `country_code: "fr"` sera présent : la geo zone `fr` suffit. Mais l'ordre des étapes du checkout compte — **pas d'adresse ⇒ pas d'option de retrait**.
3. la règle `enabled_in_store = "true"` doit exister sur l'option (le contexte de la requête pose `enabled_in_store: "true"`, `.../list-shipping-options-for-cart.js:214-218`).

### 1.5 Le provider : `manual_manual`

Un provider de fulfillment est indispensable. Pour du retrait, c'est le provider **manual** :

```js
// @medusajs/fulfillment-manual → dist/services/manual-fulfillment.js:21-23, 51
async validateFulfillmentData(optionData, data, context) {
    return data;                       // ← renvoie `data` tel quel, sans validation
}
ManualFulfillmentService.identifier = "manual";
```

L'identifiant à passer en `provider_id` est `"manual_manual"` (`<identifier>_<id du provider dans medusa-config>`), comme dans le seed existant (`src/scripts/seed.ts`, anciennement `initial-data-seed.ts:177, 243`). Ce `validateFulfillmentData` qui retourne son entrée sans la toucher a une conséquence importante — voir §3.3.

### 1.6 Ce que la Store API renvoie réellement

`defaultStoreShippingOptionsFields` est court et **ne contient pas** `service_zone` (`@medusajs/medusa → dist/api/store/shipping-options/query-config.js:4-13`). Pourtant le storefront filtre bien sur `service_zone.fulfillment_set.type` sans passer de `fields`. Pourquoi ? Parce que le **workflow force les champs**, quels que soient ceux demandés :

```js
// @medusajs/core-flows → dist/cart/workflows/list-shipping-options-for-cart.js:221-248
const fields = transform(input, ({ fields = [] }) => {
    return deduplicate([
        ...fields,
        "id", "name", "price_type", "service_zone_id", "shipping_profile_id",
        "provider_id", "data",
        "service_zone.fulfillment_set_id",
        "service_zone.fulfillment_set.type",              // ← ligne 232
        "service_zone.fulfillment_set.location.id",
        "service_zone.fulfillment_set.location.address.*", // ← ligne 234
        "type.id", "type.label", "type.description", "type.code",
        "provider.id", "provider.is_enabled",
        "rules.attribute", "rules.value", "rules.operator",
        "calculated_price.*", "prices.*", "prices.price_rules.*",
    ]);
});
```

Le workflow ajoute ensuite `amount`, `is_tax_inclusive` et `insufficient_inventory` (`.../list-shipping-options-for-cart.js:254-275`).

**Le storefront a donc raison** : le filtre de `apps/storefront/src/modules/checkout/components/shipping/index.tsx:73-77` sur `service_zone.fulfillment_set.type === "pickup"` s'appuie sur des champs garantis par le workflow, pas sur une `fields` explicite. Et l'adresse affichée à `index.tsx:348` (`service_zone.fulfillment_set.location.address`) vient de la ligne 234 ci-dessus. Rien de fragile ici — c'est du contrat de workflow.

---

## 2. Le trou : **aucune notion d'horaire**

Voici la totalité de ce que le module Fulfillment sait décrire :

| Modèle | Champs (hors id/audit) |
|---|---|
| `fulfillment_set` | `name`, `type`, `metadata` |
| `service_zone` | `name`, `geo_zones`, `shipping_options`, `metadata` |
| `shipping_option` | `name`, `price_type`, `data`, `metadata`, `provider`, `type`, `rules` |
| `shipping_option_type` | `label`, `description`, `code` |

(Sources : `@medusajs/fulfillment → dist/models/{fulfillment-set,service-zone,shipping-option,shipping-option-type}.js`.)

**Pas un champ de date, pas un champ d'heure, pas une notion de disponibilité temporelle nulle part.** Un fulfillment set de type `pickup` répond à *« où »* et à *« combien »*. Il ne répond jamais à *« quand »*.

Corollaire pour KHN : les **Horaires de retrait** (le pattern hebdomadaire) et les **Créneaux** (les tranches dérivées) sont, sans exception, du domaine à construire. Medusa n'en fournit ni le stockage, ni le calcul, ni l'UI. En revanche, il fournit plusieurs endroits *où poser le résultat du choix*, et ils ne se valent pas.

---

## 3. Où stocker le créneau choisi : les candidats

La question opérationnelle est : **quelle valeur écrite sur le panier survit jusqu'à la commande ?** Tout se joue dans un seul `transform` de `completeCartWorkflow`.

### 3.0 La preuve maîtresse : le mapping cart → order

```js
// @medusajs/core-flows → dist/cart/workflows/complete-cart.js:335-407
const cartToOrder = transform({ cart: cartData.data }, ({ cart }) => {
    const allItems = (cart.items ?? []).map(...)

    const shippingMethods = (cart.shipping_methods ?? []).map((sm) => {
        return {
            name:               sm.name,
            description:        sm.description,
            amount:             sm.raw_amount ?? sm.amount,
            is_tax_inclusive:   sm.is_tax_inclusive,
            shipping_option_id: sm.shipping_option_id,
            data:               sm.data,          // ← ligne 355
            metadata:           sm.metadata,      // ← ligne 356
            tax_lines:          prepareTaxLinesData(sm.tax_lines ?? []),
            adjustments:        prepareAdjustmentsData(sm.adjustments ?? []),
        };
    });
    ...
    return {
        region_id: cart.region?.id,
        ...
        items:            allItems,
        shipping_methods: shippingMethods,
        metadata:         cart.metadata,          // ← ligne 404
        promo_codes:      promoCodes,
        credit_lines:     creditLines,
    };
});
const createdOrders = createOrdersStep([cartToOrder]);   // ← ligne 409
```

Trois faits établis d'un coup, avec la ligne exacte :

- **`cart.metadata` → `order.metadata`** : oui, ligne **404**.
- **`cart.shipping_methods[].metadata` → `order.shipping_methods[].metadata`** : oui, ligne **356**.
- **`cart.shipping_methods[].data` → `order.shipping_methods[].data`** : oui, ligne **355**.

Et ces champs sont bien lus depuis la base : `completeCartFields` contient `"metadata"` (ligne 66) et `"shipping_methods.*"` (ligne 118) — `@medusajs/core-flows → dist/cart/utils/fields.js`. Le `*` couvre `data` et `metadata`, qui sont des colonnes de `cart_shipping_method` (`@medusajs/cart → dist/models/shipping-method.js:21-22`) et de `order_shipping_method` (`@medusajs/order → dist/models/shipping-method.js:16-17`).

**Ce qui n'est *pas* recopié** : `cart.items[].metadata` n'apparaît pas dans ce transform — il passe par `prepareLineItemData()` (ligne 346), qu'il faudrait auditer séparément. Non vérifié, mais hors sujet ici : le créneau est une propriété de la Commande, pas de la ligne.

---

### 3.1 Candidat A — `cart.metadata` → `order.metadata`

**Écriture** : `POST /store/carts/:id` accepte `metadata` :

```js
// @medusajs/medusa → dist/api/store/carts/validators.js:41-53
exports.UpdateCart = z.object({
    region_id: z.string().optional(),
    email: z.string().email().nullish(),
    billing_address: ...,
    shipping_address: ...,
    sales_channel_id: z.string().nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),   // ← ligne 48
    promo_codes: z.array(z.string()).optional(),
    locale: z.string().nullish(),
}).strict();
exports.StoreUpdateCart = WithAdditionalData(exports.UpdateCart);
```

`updateCartWorkflow` fait passer `metadata` intact jusqu'au `updateCartsStep` : `prepareCartToUpdateStep` ne retire que `promo_codes` et `additional_data` (`@medusajs/core-flows → dist/cart/workflows/update-cart.js:19-24`), et `updateCartsStep([cartInput])` est appelé ligne 218.

**Sémantique de mise à jour : c'est un MERGE, pas un remplacement.** Vérifié dans le service générique dont hérite le module Cart :

```js
// @medusajs/utils → dist/modules-sdk/medusa-internal-service.js:233-238
// Manage metadata if needed
if (isPresent(update_.metadata)) {
    entity_.metadata = update_.metadata = mergeMetadata(entity_.metadata ?? {}, update_.metadata);
}
```

et `mergeMetadata` est un merge **plat** où une valeur `""` **supprime** la clé :

```js
// @medusajs/utils → dist/common/merge-metadata.js:15-33
function mergeMetadata(metadata, metadataToMerge) {
    const merged = { ...metadata };
    for (const [key, value] of Object.entries(metadataToMerge)) {
        if (value === "") { delete merged[key]; continue; }
        // NOTE: If we want to handle the same behaviour on nested objects. […]   ← code de merge récursif COMMENTÉ
        merged[key] = value;
    }
    return merged;
}
```

**Conséquence pratique, importante** : un objet imbriqué (`metadata: { creneau: { debut, fin } }`) est **écrasé en bloc** à chaque écriture, pas fusionné. Il faut donc stocker le créneau en **clés plates de premier niveau** :

```ts
await sdk.store.cart.update(cartId, {
  metadata: {
    creneau_debut: "2026-07-14T12:15:00+02:00",   // ISO 8601 avec offset
    creneau_fin:   "2026-07-14T12:30:00+02:00",
  },
})
```

**Persistance cart → order** : ✅ vérifiée, `complete-cart.js:404`.

**Visibilité admin sans aucun code** : ✅ — et c'est le seul candidat dans ce cas.
- La page détail commande passe `showMetadata` et `showJSON` (`@medusajs/dashboard → src/routes/orders/order-detail/order-detail.tsx:76-77`) ;
- `metadata` est dans les champs par défaut de la page (`src/routes/orders/order-detail/constants.ts:21`) ;
- une **route d'édition native existe déjà** : `orders/:id/metadata/edit` (`src/dashboard-app/routes/get-route.map.tsx:399`) rendue par `OrderMetadata` → `MetadataForm` (`src/routes/orders/order-metadata/order-metadata.tsx:5-25`). L'admin peut donc **lire et corriger un créneau** sans qu'on écrive une ligne d'UI.

Nuance honnête : la carte « Metadata » de la page détail n'affiche **qu'un compteur de clés**, pas les valeurs (`src/components/common/metadata-section/metadata-section.tsx:25`) — il faut cliquer, ou lire le bloc JSON. Pour afficher « Retrait 12h15–12h30 » en haut de la commande, il faut un widget (voir §3.5).

**Interrogeabilité** : ⚠️ nuancée, et c'est le point qui décide.
- La liste `GET /admin/orders` **ne sait pas filtrer sur metadata**. Les filtres autorisés sont limitativement : `id`, `status`, `sales_channel_id`, `region_id`, `customer_id`, `q`, `created_at`, `updated_at`, `total` (`@medusajs/medusa → dist/api/admin/orders/validators.js:27-44`). Le schéma zod n'étant pas `.strict()`, un `?metadata[creneau_debut]=…` serait **silencieusement ignoré**, pas rejeté — pire qu'une erreur.
- **MAIS** : `metadata` **est** dans `defaultAdminOrderFields` (`@medusajs/medusa → dist/api/admin/orders/query-config.js:18`). Donc **la liste des commandes renvoie déjà le metadata de chaque commande**. Filtrer par `created_at` (supporté nativement) et grouper par créneau **côté client** est immédiat, sans backend.
- Filtrer côté serveur sur une clé JSON : `buildWhere` recurse dans les objets et passe le `where` tel quel à MikroORM (`@medusajs/utils → dist/modules-sdk/build-query.js:57-60`), ce qui rend `listOrders({ metadata: { creneau_debut: "…" } })` *plausible* en Postgres. **Je n'ai pas pu le vérifier** (pas d'exécution DB dans cette session) et je ne le recommande pas : le comportement de `query.graph()` sur une colonne JSON est ambigu (risque de confusion avec un filtre de relation) et non documenté. **À traiter comme non acquis.**

**Verdict A** : le seul candidat gratuit *et* natif en admin. Faible sur le filtrage serveur — mais voir §4, où l'on montre que KHN n'en a pas besoin.

---

### 3.2 Candidat B — `cart.shipping_methods[].metadata`

Séduisant sur le papier : le créneau *est* une propriété du retrait, et le retrait *est* la shipping method. La colonne existe des deux côtés (`cart_shipping_method.metadata` et `order_shipping_method.metadata`) et le mapping la recopie (`complete-cart.js:356`).

**Sauf que la Store API ne permet pas de l'écrire.** Le validateur n'expose que `option_id` et `data` :

```js
// @medusajs/medusa → dist/api/store/carts/validators.js:64-73
exports.StoreAddCartShippingMethods = z.union([
    z.object({
        option_id: z.string(),
        data: z.record(z.string(), z.unknown()).optional(),
    }),
    z.array(z.object({
        option_id: z.string(),
        data: z.record(z.string(), z.unknown()).optional(),
    })),
]);
```

Et même en contournant le validateur, **le workflow ne construirait pas de `metadata`** : le transform qui fabrique la shipping method ne pose que six champs, et `metadata` n'en fait pas partie :

```js
// @medusajs/core-flows → dist/cart/workflows/add-shipping-method-to-cart.js:111-119
return {
    shipping_option_id: shippingOption.id,
    amount:             shippingOption.calculated_price.calculated_amount,
    is_tax_inclusive:   !!shippingOption.calculated_price.is_calculated_price_tax_inclusive,
    data:               methodData?.[option.id] ?? {},
    name:               shippingOption.name,
    cart_id:            data.input.cart_id,
};   // ← pas de `metadata`
```

**Verdict B : impossible depuis le storefront sans réécrire une route Store et/ou le workflow.** Le champ persiste bien s'il est rempli — mais rien de standard ne le remplit. Écarté.

---

### 3.3 Candidat C — `cart.shipping_methods[].data` (le piège)

Celui-là **marche vraiment**, sans une ligne de backend. C'est ce qui le rend dangereux.

`POST /store/carts/:id/shipping-methods` accepte `data` (validateur ci-dessus, ligne 67), le workflow le passe au provider (`add-shipping-method-to-cart.js:89`, `method_data: inputOption.data ?? {}`), le provider `manual` **le renvoie tel quel** (`manual-fulfillment.js:21-23`), le workflow le stocke (`add-shipping-method-to-cart.js:116`), et `completeCartWorkflow` le recopie sur la commande (`complete-cart.js:355`). Bout en bout, sans backend :

```ts
await sdk.store.cart.addShippingMethod(cartId, {
  option_id: pickupOptionId,
  data: { creneau_debut: "…", creneau_fin: "…" },   // ← survit jusqu'à order.shipping_methods[0].data
})
```

**Trois raisons de le refuser malgré tout :**

1. **Fragilité mécanique — le créneau disparaît si le client re-choisit l'option.** `addShippingMethodToCartWorkflow` **supprime puis recrée** les shipping methods du même shipping profile :

   ```js
   // @medusajs/core-flows → dist/cart/workflows/add-shipping-method-to-cart.js:133-137
   const [, createdShippingMethods] = parallelize(
       removeShippingMethodFromCartStep({ shipping_method_ids: currentCollidingShippingProfileMethodIds }),
       addShippingMethodToCartStep({ shipping_methods: shippingMethodInput }),
   );
   ```

   Un second appel à `setShippingMethod` sans re-passer `data` (et le storefront starter ne passe **jamais** `data` : `apps/storefront/src/modules/checkout/components/shipping/index.tsx:139`) **efface le créneau en silence**. Aucune erreur, aucun log. Le client repasse par l'étape « livraison », et sa commande part sans créneau.

   *(À décharge : un simple refresh du panier ne le perd pas. `refreshCartShippingMethodsWorkflow` fait un **update partiel** qui ne touche que `shipping_option_id`, `name`, `amount`, `is_tax_inclusive` — `dist/cart/workflows/refresh-cart-shipping-methods.js:138-148`. `data` et `metadata` survivent. C'est le **re-pick**, pas le refresh, qui tue.)*

2. **Sémantique volée.** `data` est le champ du **fulfillment provider** — le contrat de `validateFulfillmentData(optionData, data, context)`. Il se trouve que `manual` ne valide rien. Le jour où l'on branche un provider réel, ou où Medusa durcit `manual`, un `data` rempli de dates de retrait devient une bombe à retardement. On squatte le champ d'un tiers parce qu'il est vide.

3. **Invisible en admin.** `order.shipping_methods[].data` n'est rendu nulle part dans le dashboard, sauf dans le dump JSON brut. Pas de section, pas d'édition.

**Verdict C : à rejeter explicitement, et à documenter comme rejeté** — c'est l'approche que quelqu'un réinventera dans six mois parce qu'elle « marche ».

---

### 3.4 Candidat D — module custom + module link vers la commande

L'approche lourde, et la seule qui donne un **vrai schéma interrogeable**.

```ts
// src/modules/creneaux/models/creneau-commande.ts
import { model } from "@medusajs/framework/utils"

export const CreneauCommande = model.define("creneau_commande", {
  id:     model.id({ prefix: "cren" }).primaryKey(),
  debut:  model.dateTime(),          // colonne typée, indexable
  fin:    model.dateTime(),
}).indexes([{ on: ["debut"] }])
```

```ts
// src/links/creneau-commande.ts
import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import CreneauxModule from "../modules/creneaux"

export default defineLink(OrderModule.linkable.order, CreneauxModule.linkable.creneauCommande)
```

Le pattern officiel (data model custom + `defineLink` + hook de workflow pour créer le lien + `fields: ["*", "custom.*"]` pour le relire) est documenté sur [docs.medusajs.com/resources/commerce-modules/cart/extend](https://docs.medusajs.com/resources/commerce-modules/cart/extend) — c'est le même schéma côté commande.

**Le point dur : *quand* créer le lien ?** Il faut un point d'accroche après la création de la commande. `completeCartWorkflow` en expose un :

```js
// @medusajs/core-flows → dist/cart/workflows/complete-cart.js:520-526
/**
 * @ignore
 */
createHook("orderCreated", {
    order_id:  createdOrder.id,
    cart_id:   cartData.data.id,
});
```

Ce hook **existe bel et bien à l'exécution** : `createHook` appelle `context.hookBinder(name, …)` **inconditionnellement** (`@medusajs/workflows-sdk → dist/utils/composer/create-hook.js:59`), et `createWorkflow` expose *tous* les hooks déclarés :

```js
// @medusajs/workflows-sdk → dist/utils/composer/create-workflow.js:150-152
mainFlow.hooks = {};
for (const hook of context.hooks_.declared) {
    mainFlow.hooks[hook] = context.hooksCallback_[hook].bind(context);
}
```

**MAIS il n'est pas dans le type public.** Le `.d.ts` ne déclare que `validate` :

```ts
// @medusajs/core-flows → dist/cart/workflows/complete-cart.d.ts:248-251
export declare const completeCartWorkflow: ReturnWorkflow<CompleteCartWorkflowInput, CompleteCartWorkflowOutput,
  [Hook<"validate", { input: WorkflowData<CompleteCartWorkflowInput>; cart: any }, unknown>]>;
```

`completeCartWorkflow.hooks.orderCreated(…)` **compilera en erreur TypeScript** et exigera un cast. Le `@ignore` est un marqueur de génération de doc, mais il signale clairement que ce hook n'est **pas un contrat public** : il peut disparaître dans une mineure sans que ce soit un breaking change. **Ne pas bâtir dessus.**

L'alternative propre est l'**événement**, qui *est* public et émis dans le même workflow :

```js
// @medusajs/core-flows → dist/cart/workflows/complete-cart.js:484-490
emitEventStep({
    eventName: OrderWorkflowEvents.PLACED,     // "order.placed"
    data: { id: createdOrder.id },
    options: { priority: EventPriority.CRITICAL },
})
```

Un subscriber `order.placed` (le repo en a déjà deux : `apps/backend/src/subscribers/order-confirmation.ts`, `auto-capture-payment.ts`) crée le `creneau_commande` et le lien. **Mais c'est asynchrone** : entre le `POST /store/carts/:id/complete` et l'exécution du subscriber, la commande existe **sans créneau**. Le storefront qui affiche la page de confirmation juste après pourrait ne pas voir le créneau. Et si le subscriber échoue, la commande reste orpheline — sans le filet de compensation de la saga.

**Interrogeabilité** : ✅ c'est le seul candidat qui la donne pour de bon. On interroge **depuis l'entité custom**, pas depuis la commande :

```ts
const { data: creneaux } = await query.graph({
  entity: "creneau_commande",
  fields: ["*", "order.*", "order.items.*"],
  filters: { debut: { $gte: "2026-07-15T12:15:00+02:00", $lt: "2026-07-15T12:30:00+02:00" } },
})
```

Attention : `query.graph()` **ne sait pas filtrer sur les champs d'un module lié** — il faut soit `query.index()`, soit partir de l'entité qui porte le champ (ce que fait l'exemple ci-dessus). C'est une contrainte structurante de Medusa 2, rappelée par la skill `medusa-dev:building-with-medusa` (règles `data-linked-filtering`, `data-query-graph`).

**Visibilité admin** : ❌ zéro. Rien du module custom n'apparaît dans le dashboard. Il faut **un widget** (§3.5) *et* une route API admin pour l'alimenter.

**Verdict D** : la bonne cible *le jour où le créneau devient une ressource*. Aujourd'hui, il paie un coût réel (module, migration, lien, subscriber asynchrone, widget, route admin) pour une capacité — le filtrage serveur — dont §4 montre que KHN n'a pas besoin.

---

### 3.5 Le widget admin, quel que soit le candidat

Afficher « Retrait — mercredi 15/07, 12h15–12h30 » en haut de la commande demande, au minimum, un widget sur une des quatre zones de la page détail :

```tsx
// zones disponibles — @medusajs/dashboard → src/routes/orders/order-detail/order-detail.tsx:69-74
widgets={{
  after:      getWidgets("order.details.after"),
  before:     getWidgets("order.details.before"),
  sideAfter:  getWidgets("order.details.side.after"),
  sideBefore: getWidgets("order.details.side.before"),
}}
```

Avec le **candidat A**, le widget est trivial et **sans appel réseau** : `order.metadata` est déjà dans les props (`order-detail/constants.ts:21`).

```tsx
// apps/backend/src/admin/widgets/creneau-retrait.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"

const CreneauWidget = ({ data: order }: { data: any }) => {
  const debut = order.metadata?.creneau_debut
  if (!debut) return null
  return (
    <Container>
      <Heading level="h2">Créneau de retrait</Heading>
      <Text>{new Intl.DateTimeFormat("fr-FR", {
        weekday: "long", day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(debut))}</Text>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.before" })
export default CreneauWidget
```

Avec le **candidat D**, le même widget doit en plus appeler une route admin custom pour aller chercher le créneau lié — le widget ne reçoit que la commande.

---

### 3.6 Tableau comparatif

| | A. `order.metadata` | B. shipping method `.metadata` | C. shipping method `.data` | D. module custom + link |
|---|---|---|---|---|
| Écrivable depuis la Store API | ✅ `validators.js:48` | ❌ absent du validateur `:64-73` **et** du workflow `:111-119` | ✅ `validators.js:67` | ➖ via route custom |
| Persiste cart → order | ✅ `complete-cart.js:404` | ✅ `:356` (mais jamais rempli) | ✅ `:355` | ➖ créé après la commande |
| Survit à un re-pick de l'option | ✅ (indépendant) | — | ❌ **effacé** `add-shipping-method:133-137` | ✅ |
| Visible en admin sans code | ✅ `order-detail.tsx:76-77` | ❌ JSON brut | ❌ JSON brut | ❌ rien |
| Éditable en admin sans code | ✅ `get-route.map.tsx:399` | ❌ | ❌ | ❌ |
| Filtrable côté serveur | ❌ `admin/orders/validators.js:27-44` | ❌ | ❌ | ✅ typé + indexable |
| Renvoyé par `GET /admin/orders` (liste) | ✅ `query-config.js:18` | ❌ | ❌ | ❌ |
| Renvoyé par la Store API commande | ✅ `store/orders/query-config.js:13` | ➖ | ➖ | ❌ |
| Coût | ~0 | rédhibitoire | faible mais piégé | module + migration + lien + subscriber + widget + route |
| Sémantique | correcte (propriété de la Commande) | correcte | **volée au provider** | la plus correcte |

---

## 4. Recommandation

> **Stocker le Créneau de retrait dans `cart.metadata`, en clés plates, et le laisser se propager vers `order.metadata` par le mapping natif de `completeCartWorkflow`.**

Rédigé pour un ADR :

**Décision.** Le Créneau de retrait est écrit sur le panier via `POST /store/carts/:id` en deux clés plates de premier niveau — `creneau_debut` et `creneau_fin`, chaînes ISO 8601 avec offset. `completeCartWorkflow` les recopie telles quelles sur `order.metadata` (`complete-cart.js:404`). Aucun module, aucun lien, aucune route Store custom pour l'écriture.

**Pourquoi c'est suffisant.**

- **C'est ce que dit déjà l'ADR 0003.** Un créneau est *« un label sur la commande, pas une ressource »*. `order.metadata` **est** un porte-label. Le modèle de stockage épouse exactement le modèle de domaine — pas plus, pas moins. Un module custom, à ce stade, encoderait dans le schéma une ambition (la capacité) que l'ADR 0003 a explicitement refusée.
- **La requête cuisine est déjà servie, sans backend.** « Toutes les commandes du créneau 12h15 » semble exiger un filtrage serveur. Elle ne l'exige pas, pour une raison propre à KHN : **les commandes sont same-day** (CONTEXT.md § *Commandes fermées* — *« un client ne peut jamais commander pour demain »*). La requête réelle est donc **« les commandes d'aujourd'hui, groupées par créneau »**. Or `GET /admin/orders?created_at[$gte]=…` est un filtre **nativement supporté** (`admin/orders/validators.js:41`) et la liste **renvoie déjà `metadata` pour chaque commande** (`admin/orders/query-config.js:18`). Le groupement par créneau se fait en mémoire sur les quelques dizaines de commandes d'un service. **Il n'y a pas de requête à optimiser** : un restaurant ne fait pas 100 000 commandes par jour, et une base de données n'a pas besoin d'index pour trier trente lignes.
- **C'est le seul candidat visible et corrigeable en admin sans écrire d'UI.** CONTEXT.md § *Notification de commande* pose que *« la liste des commandes de l'admin Medusa est la source de vérité »*. Le candidat A est le seul qui y met le créneau gratuitement : section Metadata (`order-detail.tsx:77`), vue JSON (`:76`), et **édition native** via `orders/:id/metadata/edit` (`get-route.map.tsx:399`). Le jour où un client appelle pour décaler son retrait, le restaurateur corrige la valeur lui-même. Avec un module custom, il faudrait lui construire ce formulaire.
- **Le coût de sortie est faible et connu.** Le jour où la capacité arrive — et l'ADR 0003 dit qu'elle arrivera — le créneau devient une ressource et *doit* migrer vers le candidat D. Cette migration est un script qui lit `order.metadata.creneau_debut` sur les commandes existantes et crée les `creneau_commande` correspondants. Les deux clés choisies aujourd'hui sont exactement les colonnes de demain. **Rien de ce qui est écrit ici n'est à jeter.**

**Ce que la décision engage aussi (les corollaires non négociables).**

- Un **widget admin** sur `order.details.before` pour rendre le créneau lisible (§3.5). ~20 lignes, aucun appel réseau. Sans lui, le créneau existe mais personne ne le voit — et il finirait par être faux sans qu'on le sache.
- Un **validateur serveur**. `cart.metadata` est écrit par le client via une route publique : **le storefront peut y mettre n'importe quoi**. Un créneau hors Horaires de retrait, dans le passé, ou violant le Délai de préparation, doit être **rejeté côté backend**. Le point d'accroche est le hook `validate` de `completeCartWorkflow` — **le seul hook publiquement typé** de ce workflow (`complete-cart.d.ts:248-251`), et il reçoit le panier complet. C'est exactement son rôle : *« perform any custom validation. If validation fails, you can throw an error to stop the workflow execution »* (`complete-cart.js:251`). **Ce n'est pas optionnel** : sans lui, `order.metadata` n'est qu'un champ que le client contrôle.

**Ce qui est explicitement rejeté** : `shipping_methods[].data` (candidat C). Il marche, il est à portée de main, et il **efface le créneau en silence** dès que le client repasse par l'étape de livraison (`add-shipping-method-to-cart.js:133-137`). Écrire ce rejet dans l'ADR est le principal service à rendre au prochain lecteur.

---

## 5. Collecter un champ custom au checkout et le propager (sous-question 3)

### 5.1 `additional_data` : ce qu'il est, et où il **ne marche pas**

Le mécanisme officiel existe : un validateur déclaré dans `src/api/middlewares.ts` étend le corps de la requête d'un champ `additional_data`, que les hooks du workflow reçoivent — [docs.medusajs.com/learn/fundamentals/api-routes/additional-data](https://docs.medusajs.com/learn/fundamentals/api-routes/additional-data).

```ts
// src/api/middlewares.ts
import { defineMiddlewares } from "@medusajs/framework/http"
import { z } from "zod"

export default defineMiddlewares({
  routes: [{
    method: "POST",
    matcher: "/store/carts/:id",
    additionalDataValidator: {
      creneau_debut: z.string().datetime({ offset: true }).optional(),
    },
  }],
})
```

Le framework fusionne ce schéma dans le validateur de la route (`@medusajs/medusa → dist/api/utils/validators.js:9-25`, `WithAdditionalData`) et l'enregistre (`@medusajs/framework → dist/http/middleware-file-loader.js:143-153`).

**Mais deux constats de source contredisent l'intuition qu'on pourrait en avoir :**

1. **`POST /store/carts/:id/complete` n'accepte AUCUN corps de requête.** Sa liste de middlewares ne contient qu'un validateur de *query* — pas de `validateAndTransformBody` :

   ```js
   // @medusajs/medusa → dist/api/store/carts/middlewares.js:136-142
   {
       method: ["POST"],
       matcher: "/store/carts/:id/complete",
       middlewares: [
           validateAndTransformQuery(StoreGetOrderParams, OrderQueryConfig.retrieveTransformQueryConfig),
       ],
   },
   ```

   et la route lance le workflow avec **le seul id du panier** :

   ```js
   // @medusajs/medusa → dist/api/store/carts/[id]/complete/route.js:12-15
   const { errors, result, transaction } = await we.run(completeCartWorkflowId, {
       input: { id: cart_id },        // ← rien d'autre ne passe
       throwOnError: false,
   });
   ```

   **On ne peut donc PAS envoyer le créneau au moment de la complétion du panier.** (La doc liste bien « Orders (Complete) » parmi les routes acceptant `additional_data` — il s'agit de `POST /admin/orders/:id/complete`, `AdminCompleteOrder = WithAdditionalData(z.object({}))` à `dist/api/admin/orders/validators.js:53`, une route **admin** qui n'a rien à voir avec le checkout client. Ne pas confondre.)

2. **`POST /store/carts/:id/shipping-methods` ignore `additional_data`.** La route le lit :

   ```js
   // @medusajs/medusa → dist/api/store/carts/[id]/shipping-methods/route.js:9-18
   await addShippingMethodToCartWorkflow(req.scope).run({
       input: {
           options: normalizedOptions.map((o) => ({ id: o.option_id, data: o.data })),
           cart_id: req.params.id,
           additional_data: payload.additional_data,      // ← ligne 16
       },
   });
   ```

   …mais `StoreAddCartShippingMethods` **n'est pas enveloppé dans `WithAdditionalData`** (`validators.js:64-73`, cf. §3.2) et, n'étant pas `.strict()`, zod **retire silencieusement** la clé inconnue. **`payload.additional_data` vaut donc toujours `undefined`.** La ligne 16 est du code mort. Signalé ici parce qu'un lecteur qui trouve cette ligne en conclura, à tort, que le mécanisme est disponible sur cette route.

**Les routes du checkout client qui acceptent réellement `additional_data`** sont `POST /store/carts` (`StoreCreateCart`, `validators.js:27`) et `POST /store/carts/:id` (`StoreUpdateCart`, `validators.js:53`). Les hooks correspondants sont `validate` et `cartUpdated` de `updateCartWorkflow` (`dist/cart/workflows/update-cart.js:186, 252, 260`), tous deux **publiquement typés**.

### 5.2 Le pattern retenu pour KHN

Compte tenu de la recommandation (§4), `additional_data` **n'est pas nécessaire** : `metadata` est un champ de première classe de `POST /store/carts/:id`. Le flux complet tient en deux morceaux.

**Storefront — écriture du créneau** (à appeler à l'étape « delivery », après `setShippingMethod`) :

```ts
// apps/storefront/src/lib/data/cart.ts
export async function setCreneau(cartId: string, debut: string, fin: string) {
  return sdk.store.cart.update(
    cartId,
    { metadata: { creneau_debut: debut, creneau_fin: fin } },   // clés PLATES — cf. mergeMetadata, §3.1
    {},
    await getAuthHeaders(),
  )
}
```

**Backend — validation à la complétion**, via le hook `validate` de `completeCartWorkflow`, le seul hook typé de ce workflow :

```ts
// apps/backend/src/workflows/hooks/validate-creneau.ts
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const debut = cart.metadata?.creneau_debut as string | undefined

  if (!debut) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Aucun créneau de retrait n'a été choisi.")
  }

  // Le créneau doit encore appartenir aux créneaux offrables MAINTENANT :
  // Horaires de retrait − Fermetures exceptionnelles − Délai de préparation (ADR 0003).
  // Recalculé ici, jamais fait confiance au client.
  const creneaux = container.resolve("creneauxService")
  if (!(await creneaux.estOffrable(new Date(debut)))) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Ce créneau de retrait n'est plus disponible.")
  }
})
```

Une remarque de conception, pas de framework : **valider au moment de la complétion, et pas seulement au moment du choix, est le seul point de contrôle qui compte.** Un client peut rester quinze minutes sur la page de paiement ; le créneau qu'il a choisi peut être passé, ou tomber sous le Délai de préparation, entre son clic et son paiement. C'est exactement le scénario que le hook `validate` — exécuté avant toute autre opération et avant l'autorisation du paiement (`complete-cart.js:292`, hook posé avant le bloc `when("create-order")`) — est fait pour attraper.

---

## 6. Exposer les Horaires de retrait au storefront (sous-question 4)

### 6.1 La forme de l'API

Rien dans Medusa ne s'en approche. C'est une **route Store custom**, alimentée par un module custom qui détient les Horaires de retrait, les Fermetures exceptionnelles et le Délai de préparation (CONTEXT.md).

```ts
// apps/backend/src/api/store/creneaux/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const creneaux = req.scope.resolve("creneauxService")

  // Dérivés à la volée : Horaires − Fermetures − Délai de préparation. Rien n'est stocké par créneau (ADR 0003).
  const disponibles = await creneaux.listerDisponibles(new Date())

  res.json({
    creneaux: disponibles.map((c) => ({
      debut: c.debut.toISOString(),
      fin:   c.fin.toISOString(),
    })),
    // Le storefront a besoin de savoir DISTINGUER « il n'y a plus de créneau aujourd'hui »
    // (état « Commandes fermées ») d'une erreur réseau. C'est une information, pas une liste vide.
    commandes_ouvertes: disponibles.length > 0,
  })
}
```

**Deux points vérifiés qui conditionnent l'implémentation :**

1. **La route exigera la clé publiable.** Le framework applique le middleware de publishable key à **tout le préfixe `/store`**, routes custom comprises :

   ```js
   // @medusajs/framework → dist/http/router.js:98
   __classPrivateFieldGet(this, _ApiLoader_instances, "m", _ApiLoader_applyStorePublishableKeyMiddleware).call(this, "/store");
   ```

   Le JS SDK (`sdk.client.fetch`) envoie `x-publishable-api-key` automatiquement — c'est déjà ce que fait `apps/storefront/src/lib/data/fulfillment.ts`. Un `fetch()` nu échouerait.

2. **Le CORS `storeCors` s'applique de même** (`router.js:94`) — rien à configurer de plus que ce qui l'est déjà.

### 6.2 Ce que la source de vérité implique

L'ADR 0003 pose que les créneaux sont *« dérivés à la requête depuis les Horaires de retrait configurés en admin, moins les Fermetures exceptionnelles, moins le Délai de préparation — rien n'est stocké par créneau »*. La route ci-dessus est donc **purement calculatoire** : elle ne lit aucune table de créneaux, elle lit une table d'**horaires** et calcule. C'est cohérent, et c'est ce qui rend l'ajout ultérieur d'une capacité possible sans réécriture : le jour venu, `listerDisponibles()` soustraira en plus les créneaux pleins, et **la signature de la route ne bouge pas**.

**Point de vigilance non résolu — les fuseaux horaires.** Un « créneau 12h15 » est une heure **locale du restaurant** (Europe/Paris). Le stocker en ISO avec offset (`+02:00`) est correct mais ne dit pas *quel fuseau fait autorité* — et l'offset français change deux fois par an. La règle à fixer (et à écrire quelque part) : **le fuseau du restaurant est la source de vérité, le serveur calcule en Europe/Paris, et le navigateur du client ne décide de rien.** Un client qui commande depuis un téléphone réglé sur un autre fuseau ne doit jamais voir des créneaux décalés. Ce n'est pas une question Medusa — mais c'est le bug le plus probable de cette fonctionnalité.

---

## 7. Questions ouvertes et non-vérifiés

**Explicitement non vérifié :**

- **Filtrage serveur sur une clé de `metadata`.** `buildWhere` recurse dans les objets et transmet le `where` à MikroORM (`@medusajs/utils → dist/modules-sdk/build-query.js:57-60`), ce qui rend `listOrders({ metadata: { creneau_debut: … } })` plausible en Postgres. **Je n'ai exécuté aucune requête** (pas de base dans cette session). Le comportement de `query.graph()` sur une colonne JSON est en particulier ambigu (risque d'être interprété comme un filtre de relation). **À tester avant de s'appuyer dessus.** La recommandation §4 est construite pour ne pas en dépendre.
- **`cart.items[].metadata` → `order.items[].metadata`.** Le mapping passe par `prepareLineItemData()` (`complete-cart.js:346`), que je n'ai pas ouvert. Sans importance ici (le créneau n'est pas une propriété de ligne), mais **à ne pas présumer** si la question se pose pour les Sélections de Formule.
- **La stabilité du hook `orderCreated`.** Il existe à l'exécution (preuve : `create-hook.js:59` + `create-workflow.js:150-152`) mais est absent du type public (`complete-cart.d.ts:248-251`) et marqué `@ignore`. Je n'ai pas trouvé de doc officielle le documentant comme public. **Traiter comme une API interne.**

**À décider (hors périmètre de cette recherche) :**

- **Le fuseau horaire fait autorité** (§6.2). Le trancher avant d'écrire la première ligne, pas après.
- **La granularité et le format des clés.** `creneau_debut` + `creneau_fin` (deux instants) ou `creneau_debut` + `creneau_duree_minutes` ? Le premier est plus verbeux mais lisible tel quel dans l'admin — ce qui, vu que l'admin est la source de vérité (CONTEXT.md), pèse lourd.
- **Le comportement quand le hook `validate` rejette un créneau périmé.** Le client a rempli son panier, il est sur la page de paiement, et son créneau vient d'expirer. Lui montrer quoi ? Le renvoyer où ? C'est une décision d'UX, et c'est le cas limite qui arrivera tous les jours à 13h55.
- **Le seuil de migration vers le candidat D.** L'ADR 0003 dit que la capacité viendra. Nommer dès maintenant le signal qui déclenchera la migration (« le jour où l'on veut refuser une commande parce qu'un créneau est plein ») évite de la faire trop tôt par confort, ou trop tard dans l'urgence.
