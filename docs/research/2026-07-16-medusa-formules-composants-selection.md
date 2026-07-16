# Medusa 2.16 : la Curation des Composants d'une Formule et la Sélection du client

**Date** : 2026-07-16
**Version vérifiée** : Medusa **2.16.0** (`apps/backend/package.json:27-36`)
**Statut** : recherche — aucune décision prise. La section « Recommandation » est écrite pour être convertie en ADR 0005.

## La question

L'ADR 0001 a posé le modèle : une **Formule** est un Produit à Variante unique portant le prix fixe, ses **Composants** sont **curés** (pas dérivés), et la **Sélection** du client ne porte **aucun argent**. Il n'a pas dit *où ça vit*. Deux inconnues restent :

1. **La Curation** — comment enregistrer la liste explicite des `ProductVariant` autorisées dans le slot « entrée », dans le slot « plat » ?
2. **La Sélection** — où l'écrire sur la ligne de panier puis de commande, de façon qu'elle survive à `completeCartWorkflow`, reste lisible depuis l'admin, et ne puisse être ni perdue en silence ni falsifiée ?

Mais la question qui commande tout est méthodologique, et elle vient de l'ADR 0004. Cet ADR a rejeté `shipping_methods[].data` **précisément parce que ça marchait sans backend** : le workflow supprime et recrée les shipping methods en collision (`add-shipping-method-to-cart.js:133-137`), le storefront ne renvoie jamais `data`, et le créneau disparaît sans erreur ni log. `line_item.metadata` a exactement le même profil : gratuit, client-écrivable, natif. **A-t-il le même piège ?** C'est la §1, et elle passe avant tout le reste, parce que si la réponse est oui, il n'y a rien à recommander.

## Convention de citation

Les paquets Medusa sont résolus par pnpm dans `node_modules/.pnpm/@medusajs+<pkg>@2.16.0_<hash>/node_modules/@medusajs/<pkg>/`. Pour la lisibilité, les citations sont notées **`@medusajs/<pkg> → dist/chemin.js:ligne`**. Les paquets ne publient que du `dist` compilé, sauf `@medusajs/dashboard` qui publie aussi `src` (TSX lisible) — les citations dashboard pointent donc sur `src`. Les chemins du repo sont donnés tels quels.

Tout ce qui est affirmé ici sans citation est soit une évidence, soit **signalé comme non vérifié**. Ce qui a été **exécuté** est signalé comme tel.

---

## 1. Le piège de l'ADR 0004 : `line_item.metadata` a-t-il son équivalent ?

**Réponse courte : non. Et ce n'est pas de la chance — c'est explicitement codé.** Le détail vaut d'être lu, parce que le mécanisme de déduplication *existe bel et bien*, et que quiconque le trouvera sans lire ces quinze lignes en conclura l'inverse.

### 1.1 La déduplication existe, et elle est agressive

`addToCartWorkflow` ne crée pas aveuglément une ligne par appel. Il passe par une étape d'arbitrage :

```js
// @medusajs/core-flows → dist/cart/workflows/add-to-cart.js:189-192
const { itemsToCreate = [], itemsToUpdate = [] } = (0, steps_1.getLineItemActionsStep)({
    id: cart.id,
    items: lineItems,
});
```

Et cette étape **fusionne des lignes en accumulant la quantité** :

```js
// @medusajs/core-flows → dist/cart/steps/get-line-item-actions.js:58-61
if (existingItem) {
    const quantity = utils_1.MathBN.sum(existingItem.quantity, item.quantity ?? 1);
    // In case of multiple items with the same variant_id, metadata and custom price, we accumulate the quantity.
    existingItem.quantity = quantity;
```

C'est exactement le piège redouté : ajouter deux fois « Menu Midi » produirait **une ligne `quantity: 2`**, et une des deux Sélections serait perdue — sans erreur, sans log. **Le commentaire de la ligne 60 est la réponse**, et il faut le lire mot à mot : *« same variant_id, **metadata** and custom price »*.

### 1.2 La clé de déduplication inclut la metadata, en comparaison **profonde**

```js
// @medusajs/core-flows → dist/cart/steps/get-line-item-actions.js:50-57
const metadataMatches = (existingItem, newItem) =>
    (!(0, utils_1.isPresent)(existingItem?.metadata) && !(0, utils_1.isPresent)(newItem.metadata)) ||
    (0, utils_1.deepEqualObj)(existingItem?.metadata, newItem.metadata);
for (const item of data.items) {
    const variantItems = variantItemsMap.get(item.variant_id);
    const existingItem = variantItems?.find((existingItem) => item.is_custom_price
        ? metadataMatches(existingItem, item) && item.unit_price === existingItem.unit_price
        : metadataMatches(existingItem, item) && !existingItem.is_custom_price);
```

Deux points décisifs :

- **`metadataMatches` est une condition nécessaire de la fusion.** Deux lignes de même `variant_id` mais de metadata différentes ne fusionnent **pas** : `find` échoue, et l'item part dans `itemsToCreate` (`:76-78`).
- **La comparaison est `deepEqualObj`, pas une égalité de surface.** La fonction récurse sur toutes les clés :

```js
// @medusajs/utils → dist/common/deep-equal-obj.js:14-24
const obj1Keys = Object.keys(obj1);
const obj2Keys = Object.keys(obj2);
if (obj1Keys.length !== obj2Keys.length) { return false; }
for (const key of obj1Keys) {
    if (!obj2Keys.includes(key) || !deepEqualObj(obj1[key], obj2[key])) { return false; }
}
return true;
```

La metadata existante est bien relue depuis la base pour cette comparaison — `"metadata"` est dans le `select` de la requête (`get-line-item-actions.js:32-39`).

**C'est la différence structurelle avec `shipping_methods[].data`.** Le workflow des shipping methods traite `data` comme un passager : il détruit et recrée sans jamais le regarder (`add-shipping-method-to-cart.js:133-137`). Le workflow des line items traite `metadata` comme **une partie de l'identité de la ligne**. Medusa a anticipé le cas.

### 1.3 Vérification par exécution

Le point porte toute la recommandation ; il a été **exécuté** plutôt que seulement lu — en important les fonctions réellement installées (`@medusajs/utils@2.16.0`) et en reproduisant `metadataMatches` à l'identique :

| Cas | Résultat |
|---|---|
| Plat simple `{}` vs `{}` | **MERGE** (quantité cumulée) |
| Plat simple `undefined` vs `undefined` | **MERGE** |
| `{}` vs `undefined` | **MERGE** |
| Formule `{entree:A, plat:B}` vs `{entree:A, plat:B}` | **MERGE** |
| Formule `{entree:A, plat:B}` vs `{entree:C, plat:B}` | **SÉPARÉ** ✅ |
| Mêmes clés, **ordre d'écriture inversé** | **MERGE** ✅ |
| Sélection imbriquée `[{e:A},{p:B}]` vs `[{e:A},{p:B}]` | **MERGE** |
| Sélection imbriquée `[{e:A},{p:B}]` vs `[{p:B},{e:A}]` — **mêmes choix** | **SÉPARÉ** ⚠️ |
| `{}` vs `[]` | **MERGE** (curiosité sans portée ici) |

Trois enseignements :

1. **Le comportement voulu est le comportement obtenu.** Deux Formules aux Sélections différentes font deux lignes. Deux plats simples identiques font une ligne `quantity: 2`. Rien à corriger.
2. **L'ordre des clés d'un objet plat est sans effet** — `deepEqualObj` compare par nom de clé (`:19-22`). Une metadata plate est donc *déterministe*.
3. **L'ordre d'un tableau, lui, compte.** `typeof [] === "object"`, donc `Object.keys([a,b]) === ["0","1"]` : `[A,B]` et `[B,A]` ne sont pas deep-equal. Deux clients commandant la **même** Formule avec les **mêmes** choix, sérialisés dans un ordre différent, feraient **deux lignes de quantité 1 au lieu d'une ligne de quantité 2**. C'est un défaut cosmétique, et il **échoue dans le bon sens** — on duplique une ligne, on ne perd pas une Sélection. Mais c'est un argument de plus pour les clés plates : elles n'ont pas d'ordre.

### 1.4 Le merge shallow : réel, mais il ne mord pas ici

`mergeMetadata` est bien un merge **plat**, dont le code de récursion est commenté :

```js
// @medusajs/utils → dist/common/merge-metadata.js:15-33
function mergeMetadata(metadata, metadataToMerge) {
    const merged = { ...metadata };
    for (const [key, value] of Object.entries(metadataToMerge)) {
        if (value === "") { delete merged[key]; continue; }
        // NOTE: If we want to handle the same behaviour on nested objects. […]   ← récursion COMMENTÉE
        merged[key] = value;
    }
    return merged;
}
```

Et il s'applique bien aux line items — le service générique dont hérite le module Cart le fait sur toute mise à jour :

```js
// @medusajs/utils → dist/modules-sdk/medusa-internal-service.js:233-239
toUpdateData.forEach(({ entity, update }) => {
    const update_ = update;
    const entity_ = entity;
    if ((0, common_1.isPresent)(update_.metadata)) {
        entity_.metadata = update_.metadata = (0, common_1.mergeMetadata)(entity_.metadata ?? {}, update_.metadata);
    }
});
```

**La conséquence est réelle mais différente de celle de l'ADR 0004.** Une Sélection imbriquée (`metadata: { selection: { entree, plat } }`) est écrasée **en bloc** à chaque écriture — jamais fusionnée clé à clé. Pour une Sélection, cet écrasement en bloc est en fait le comportement *souhaitable* : une Sélection est un tout, pas un patch. Le vrai coût de l'imbrication n'est donc pas ici — il est en §1.3 (ordre des tableaux) et en §5 (l'admin refuse d'éditer une valeur non primitive).

Noter le garde-fou qui sauve tout le reste : **`isPresent` est faux sur `{}`** —

```js
// @medusajs/utils → dist/common/is-present.js:17-19
if ((0, is_object_1.isObject)(value)) {
    return Object.keys(value).length > 0;
}
```

— donc une mise à jour qui porte `metadata: {}` **ne touche pas** la metadata en base. C'est ce qui rend inoffensifs les chemins de §1.5.

### 1.5 Les autres chemins d'écriture ne perdent rien non plus

Trois chemins auraient pu écraser la Sélection. Aucun ne le fait :

- **Changer la quantité depuis le storefront.** `POST /store/carts/:id/line-items/:line_id` n'envoie que `{ quantity }` (`apps/storefront/src/lib/data/cart.ts:187`). Le workflow étale l'update tel quel (`update-line-item-in-cart.js:42-52`), donc `updateData.metadata` est `undefined`, donc `isPresent(undefined)` est faux, donc la metadata en base est **intacte**. C'est le contraste exact avec l'ADR 0004 : là-bas, ne pas renvoyer `data` **effaçait** ; ici, ne pas renvoyer `metadata` **préserve**.
- **Le refresh du panier** (`refreshCartItemsWorkflow`, déclenché par les promotions et les prix). En `force_refresh`, il reconstruit les lignes via `prepareLineItemData` (`get-variants-and-items-with-prices.js:55`) puis `updateLineItemsStep` (`refresh-cart-items.js:119-122`). Mais il relit d'abord le panier avec `cartFieldsForRefreshSteps`, qui contient `"items.*"` (`cart/utils/fields.js:28`) — donc `item.metadata` est présent, et `prepareLineItemData:54` le réémet à l'identique. Le merge fusionne la metadata avec elle-même. **Aucune perte.** Et même si la relecture perdait le champ, `metadata: {}` ne serait pas `isPresent` et n'écraserait rien.
- **La complétion du panier.** Voir §2 — c'est une copie verbatim.

### 1.6 Verdict

> **`line_item.metadata` n'a pas le piège de `shipping_methods[].data`.** La déduplication existe et fusionnerait bel et bien deux Formules en une ligne `quantity: 2` — mais elle est **explicitement indexée sur la metadata**, en comparaison **profonde** (`get-line-item-actions.js:50-57`), et Medusa le documente dans son propre commentaire (`:60`). Deux Sélections différentes donnent deux lignes. Le seul écart constaté (§1.3) fait **dupliquer une ligne**, jamais disparaître une Sélection : il échoue dans la direction sûre.

La différence de fond avec l'ADR 0004 tient en une phrase : **`data` était le champ d'un tiers que Medusa transportait sans le regarder ; `metadata` est un champ de première classe que Medusa fait entrer dans l'identité de la ligne.**

---

## 2. La chaîne panier → commande, prouvée ligne à ligne

L'ADR 0004 avait laissé ce point explicitement ouvert : *« `cart.items[].metadata` → `order.items[].metadata`. Le mapping passe par `prepareLineItemData()` (`complete-cart.js:346`), que je n'ai pas ouvert. […] **à ne pas présumer** si la question se pose pour les Sélections de Formule »* (`docs/research/2026-07-14-medusa-pickup-et-creneaux.md:788`). **La question se pose. Le fichier est ouvert. La réponse est oui.**

```js
// @medusajs/core-flows → dist/cart/workflows/complete-cart.js:336-347
const allItems = (cart.items ?? []).map((item) => {
    const input = {
        item,                              // ← l'item du panier, metadata comprise
        variant: item.variant,
        cartId: cart.id,
        unitPrice: item.unit_price,
        isTaxInclusive: item.is_tax_inclusive,
        taxLines: item.tax_lines ?? [],
        adjustments: item.adjustments ?? [],
    };
    return (0, prepare_line_item_data_1.prepareLineItemData)(input);
});
```

et le mapping recopie la metadata sans la toucher :

```js
// @medusajs/core-flows → dist/cart/utils/prepare-line-item-data.js:30-55
let lineItem = {
    quantity: item?.quantity,
    title: item?.title ?? variant?.product?.title,
    // …
    metadata: item?.metadata ?? {},        // ← ligne 54
};
```

Le résultat part directement dans la commande :

```js
// @medusajs/core-flows → dist/cart/workflows/complete-cart.js:402-409
    items:            allItems,            // ← ligne 402
    shipping_methods: shippingMethods,
    metadata:         cart.metadata,       // ← ligne 404 (le Créneau, ADR 0004)
    // …
});
const createdOrders = (0, create_orders_1.createOrdersStep)([cartToOrder]);
```

Et le champ est bien lu depuis la base : `completeCartFields` (`cart/utils/fields.js:65`) contient `"items.*"` (`:114`), et `metadata` est une colonne de `cart_line_item` (`@medusajs/cart → dist/models/line-item.js:37`) comme de `order_line_item` (`@medusajs/order → dist/models/line-item.js:33`).

**La chaîne est complète et sans trou :**

```
POST /store/carts/:id/line-items  { metadata }
  → StoreAddCartLineItem              (medusa → dist/api/store/carts/validators.js:58)
  → prepareLineItemData               (core-flows → …/prepare-line-item-data.js:54)
  → getLineItemActionsStep            (core-flows → …/get-line-item-actions.js:50-57)  ← dédup metadata-aware
  → cart_line_item.metadata           (cart → dist/models/line-item.js:37)
  → completeCartFields "items.*"      (core-flows → dist/cart/utils/fields.js:114)
  → prepareLineItemData               (…/prepare-line-item-data.js:54)   ← verbatim
  → order_line_item.metadata          (order → dist/models/line-item.js:33)
```

---

## 3. Où enregistrer la Sélection : les candidats

### 3.1 Candidat A — `line_item.metadata`

**Écriture** : le validateur de la route publique l'accepte explicitement.

```js
// @medusajs/medusa → dist/api/store/carts/validators.js:55-63
exports.StoreAddCartLineItem = zod_1.z.object({
    variant_id: zod_1.z.string(),
    quantity: zod_1.z.number().gt(0),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullish(),   // ← ligne 58
});
exports.StoreUpdateCartLineItem = zod_1.z.object({
    quantity: zod_1.z.number().gte(0), // can be 0 to remove the item from the cart
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullish(),   // ← ligne 62
});
```

(`POST /store/carts` l'accepte aussi, par `ItemSchema` — `validators.js:8-12`, `metadata` à `:11`. Et le DTO de workflow le porte : `@medusajs/types → dist/cart/workflows.d.ts:105`.)

**Écriture, en pratique** :

```ts
await sdk.store.cart.createLineItem(cartId, {
  variant_id: formuleVariantId,
  quantity: 1,
  metadata: {
    formule_entree_variant_id: "variant_01J…",     // clés PLATES — cf. §1.3, §1.4, §5
    formule_plat_variant_id:   "variant_01K…",
  },
})
```

**Persistance cart → order** : ✅ vérifiée, `prepare-line-item-data.js:54` (§2).
**Survit à un changement de quantité** : ✅ `isPresent(undefined)` faux (§1.5).
**Survit à un refresh / une promo** : ✅ `fields.js:28` + `prepare-line-item-data.js:54` (§1.5).
**Deux Formules ≠ ne fusionnent pas** : ✅ `get-line-item-actions.js:50-57` (§1.2, vérifié par exécution §1.3).
**Lisible par le storefront** : ✅ `*items` est dans les champs par défaut de la commande Store (`@medusajs/medusa → dist/api/store/orders/query-config.js:53`), et le repo demande déjà `*items.metadata` sur le panier (`apps/storefront/src/lib/data/cart.ts:32`).
**Visible en admin** : ⚠️ nuancé — voir §5. C'est la vraie faiblesse du candidat.
**Coût** : ~0 backend pour l'écriture. Un validateur (§4) et un widget (§5) sont non négociables.

### 3.2 Candidat B — des line items enfants (parent/child)

L'intuition « la Formule est une ligne parent, chaque Sélection une ligne enfant à 0 € » se heurte à un fait simple : **il n'existe aucune notion de parent/child line item dans Medusa 2.16.** Grep infructueux sur `parent_line_item` et `parent_item_id` dans `@medusajs/cart → dist/models/` et `@medusajs/order → dist/models/`. Le modèle `LineItem` n'a qu'un `belongsTo` vers le panier (`@medusajs/cart → dist/models/line-item.js:55-57`).

Il faudrait donc simuler le lien par… une clé de metadata (`metadata.parent_line_item_id`), c'est-à-dire retomber sur le candidat A en ayant multiplié les lignes par trois. Et surtout : **une ligne enfant à 0 € est une ligne qui porte un prix.** Un prix de zéro est un prix. Il serait calculé par le pricing engine (donc il faudrait des variantes à 0 €, ou un `unit_price` custom — `prepare-line-item-data.js:56-58` pose `is_custom_price`), et le total de la commande deviendrait une somme dont la Formule n'est qu'un terme. **Écarté** : contraire à l'esprit de l'ADR 0001, et non natif.

### 3.3 Candidat C — un module custom lié au line item par Module Link

L'approche lourde. Un modèle `FormuleSelection` (`line_item_id`, `composant`, `variant_id`) lié par `defineLink` au line item de commande.

**Le point dur est le même qu'à l'ADR 0004, en pire.** Le lien ne peut être créé qu'**après** la commande : le hook `orderCreated` de `completeCartWorkflow` existe à l'exécution mais **n'est pas dans le type public** (`complete-cart.d.ts:248` ne déclare que `validate`) et porte `@ignore` — l'ADR 0004 a déjà tranché qu'il ne faut pas bâtir dessus. Reste le subscriber `order.placed`, **asynchrone** : entre le paiement et son exécution, la commande existe **sans Sélection**. Or la Sélection est ce que la cuisine doit cuire — et la Notification de commande part sur ce même `order.placed` (`apps/backend/src/subscribers/order-confirmation.ts`). **Un Ticket cuisine émis avant que les Sélections ne soient écrites est un ticket faux**, et rien ne garantit l'ordre des subscribers.

Il y a pire : sur le **panier**, ce module devrait maintenir sa propre synchronisation avec des lignes que `getLineItemActionsStep` fusionne, que `refreshCartItemsWorkflow` met à jour et que `deleteLineItemsWorkflow` supprime. La metadata suit la ligne gratuitement parce qu'elle **est** la ligne ; un module lié devrait suivre à la main. **Écarté aujourd'hui** — mais c'est la cible de sortie (§7).

### 3.4 Candidat D — `cart.metadata`

Le Créneau y vit déjà (ADR 0004), et il y survit très bien — parce qu'un Créneau est une propriété de **la Commande**. Une Sélection est une propriété de **la ligne**. Y mettre les Sélections obligerait à inventer un index (`selection_ligne_1_entree`…) que rien ne rattache à un `line_item.id` — lequel n'existe pas encore au moment où le client choisit. Et deux Formules dans le même panier écraseraient leurs clés mutuellement, `mergeMetadata` étant plat (`merge-metadata.js:15-33`). **Écarté** : mauvaise cardinalité.

### 3.5 Candidat E — les `adjustments` — **disqualifié par l'ADR 0001**

À nommer pour le rejeter, parce que le mot « adjustment » attire. Le modèle **exige** un montant :

```js
// @medusajs/cart → dist/models/line-item-adjustment.js:10-17, 34
id: utils_1.model.id({ prefix: "caliadj" }).primaryKey(),
description: utils_1.model.text().nullable(),
code: utils_1.model.text().nullable(),
amount: utils_1.model.bigNumber(),                       // ← ligne 13 : NON nullable
is_tax_inclusive: utils_1.model.boolean().default(false),
// …
.checks([(columns) => `${columns.amount} >= 0`]);        // ← ligne 34 : contrainte en base
```

`amount` n'est pas nullable et une contrainte SQL le borne. **Un adjustment est de l'argent, par construction.** Enregistrer une Sélection en adjustment reviendrait à écrire `amount: 0` — c'est-à-dire à faire entrer la Sélection dans le calcul du total, et à mettre un montant hors du pricing engine. **L'ADR 0001 disqualifie ce candidat sans discussion** : *« la Sélection ne porte aucun argent »*. Les adjustments sont d'ailleurs recopiés dans le total de la commande (`complete-cart.js:358`, `prepareAdjustmentsData`) — ce ne serait pas un champ inerte, ce serait un terme de l'addition.

### 3.6 Tableau comparatif — la Sélection

| | A. `line_item.metadata` | B. lignes enfants | C. module + link | D. `cart.metadata` | E. adjustments |
|---|---|---|---|---|---|
| Écrivable depuis la Store API | ✅ `validators.js:58` | ➖ via lignes à 0 € | ❌ route custom | ✅ `validators.js:48` | ❌ |
| Existe nativement en 2.16 | ✅ | ❌ pas de parent/child | ➖ à construire | ✅ | ✅ |
| Persiste cart → order | ✅ `prepare-line-item-data.js:54` | ✅ | ➖ après la commande | ✅ `complete-cart.js:404` | ✅ (dans le total !) |
| Bonne cardinalité (1 par ligne) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Résiste à la dédup de lignes | ✅ `get-line-item-actions.js:50-57` | — | — | — | ❌ non lu par la dédup |
| Ne porte aucun argent (ADR 0001) | ✅ | ❌ 0 € est un prix | ✅ | ✅ | ❌ **`amount` non nullable** |
| Disponible **synchrone** à `order.placed` | ✅ | ✅ | ❌ subscriber async | ✅ | ✅ |
| Visible en admin sans code | ❌ JSON brut (§5) | ✅ dans le récap | ❌ rien | ✅ carte Metadata | ➖ |
| Éditable en admin sans code | ❌ (§5) | ❌ | ❌ | ✅ `get-route.map.tsx:399` | ❌ |
| Coût | ~0 + validateur + widget | lignes fantômes | module + link + subscriber + widget + route | — | — |
| Verdict | **retenu** | écarté | cible de sortie | écarté | **disqualifié ADR 0001** |

---

## 4. La validation serveur : non négociable, et où l'accrocher

`line_item.metadata` est écrit par le client via une route publique (`validators.js:58`). **Le storefront peut y mettre n'importe quoi** — y compris `formule_plat_variant_id` pointant sur le homard à 40 € si un jour la carte en a un. C'est exactement la situation que l'ADR 0004 a rencontrée avec `cart.metadata`, et la réponse est la même : **re-vérifier côté serveur, contre la Curation**.

**Le mécanisme `additional_data` n'est pas disponible sur ces routes** — et c'est un piège documenté ici pour la seconde fois. La route le lit :

```js
// @medusajs/medusa → dist/api/store/carts/[id]/line-items/route.js:9-15
await we.run(core_flows_1.addToCartWorkflowId, {
    input: {
        cart_id: req.params.id,
        items: [req.validatedBody],
        additional_data: req.validatedBody.additional_data,      // ← ligne 13
    },
});
```

…mais `StoreAddCartLineItem` **n'est pas enveloppé dans `WithAdditionalData`** (`validators.js:55-59` ; comparer avec `StoreCreateCart`, `:27`) et, n'étant pas `.strict()`, zod **retire silencieusement** la clé inconnue. **Vérifié par exécution** sur le validateur réellement installé :

```
StoreAddCartLineItem.parse({ variant_id, quantity, metadata, additional_data })
  -> {"variant_id":"variant_123","quantity":1,"metadata":{"formule_entree_variant_id":"variant_A"}}
  additional_data survit ? false
  metadata survit ?        true
```

**La ligne 13 est du code mort**, exactement comme `dist/api/store/carts/[id]/shipping-methods/route.js:16` l'était (`docs/research/2026-07-14-medusa-pickup-et-creneaux.md:684`). Idem pour `[line_id]/route.js:14`. Un lecteur qui trouve ces lignes en conclura, à tort, que le mécanisme est disponible. **Il ne l'est pas.** `metadata`, lui, passe — c'est ce qui rend le candidat A viable sans route custom.

**Deux points d'accroche, tous deux publiquement typés :**

```ts
// @medusajs/core-flows → dist/cart/workflows/add-to-cart.d.ts:69-72
export declare const addToCartWorkflow: ReturnWorkflow<AddToCartWorkflowInputDTO & AdditionalData, undefined,
  [Hook<"validate", { input: AddToCartWorkflowInputDTO & AdditionalData; cart: any }, unknown>, …]>;
```

```ts
// @medusajs/core-flows → dist/cart/workflows/complete-cart.d.ts:248
export declare const completeCartWorkflow: ReturnWorkflow<CompleteCartWorkflowInput, CompleteCartWorkflowOutput,
  [Hook<"validate", { input: WorkflowData<CompleteCartWorkflowInput>; cart: any }, unknown>]>;
```

**Les deux sont nécessaires, et pour des raisons différentes** — c'est la même leçon que l'ADR 0004 a tirée du créneau qui expire pendant le paiement :

- **`addToCartWorkflow.hooks.validate`** rejette tout de suite une Sélection incohérente (composant manquant, variante non curée). Il reçoit `input.items[].metadata` — c'est-à-dire ce que le client vient d'envoyer. C'est le hook qui donne une **erreur utile au client**, au moment où il peut la corriger. `updateLineItemInCartWorkflow` expose le même hook (`update-line-item-in-cart.d.ts:125-128`), et il faut le couvrir aussi : `StoreUpdateCartLineItem` accepte `metadata` (`validators.js:62`).
- **`completeCartWorkflow.hooks.validate`** est le point de contrôle qui *compte*. Le hook reçoit `cart: cartData.data` (`complete-cart.js:292-295`), fetché avec `completeCartFields` (`:273`) qui contient `"items.*"` (`fields.js:114`) — **donc `cart.items[].metadata` est disponible dans le hook**. La Curation peut avoir changé entre le moment où le client a rempli son panier et le moment où il paie : un plat retiré d'une Formule à 12h05 ne doit pas être vendu à 12h07. C'est le pendant exact du créneau qui expire pendant le paiement. Le hook est exécuté avant le bloc `when("create-order")` (`:297`) et avant l'autorisation du paiement.

Ce que le validateur doit vérifier — et l'ADR 0001 en donne la liste :

1. la Variante de la ligne **est** une Formule (sinon, pas de Sélection attendue) ;
2. **chaque** composant de la Formule est rempli — pas de slot manquant ;
3. **chaque** variante choisie appartient à la Curation **de son composant** — pas de la Formule en général ;
4. aucune clé de Sélection en trop ;
5. la variante choisie est toujours achetable (produit publié).

Le point 3 est celui qui protège la marge, et c'est très exactement pourquoi l'ADR 0001 a exigé une curation explicite : *« un plat premium qui apparaîtrait silencieusement dans une formule à prix fixe fait perdre de l'argent invisiblement »*. **Sans ce validateur, la curation n'est qu'une suggestion d'UI.**

---

## 5. La visibilité admin : la vraie faiblesse du candidat A

L'ADR 0004 notait que la carte Metadata de la commande n'affiche qu'un compte de clés et qu'un widget était nécessaire. **Pour un line item, c'est pire : il n'y a pas de carte du tout.**

**Le constat, en trois faits :**

1. **La carte « Metadata » ne lit que la metadata de la commande**, jamais celle des lignes :

```tsx
// @medusajs/dashboard → src/components/common/metadata-section/metadata-section.tsx:21-25
if (!("metadata" in data)) {
  return null
}
const numberOfKeys = data.metadata ? Object.keys(data.metadata).length : 0
```

Elle est montée avec `data={order}` (`src/routes/orders/order-detail/order-detail.tsx:75-77`). `order.items[].metadata` ne la traverse pas.

2. **Aucune route native d'édition de la metadata d'un line item n'existe.** La table de routes en déclare pour le produit (`get-route.map.tsx:165`), la variante (`:217`), la catégorie (`:286`), la commande (`:399`), le client, la région, etc. — **aucune pour un item de commande**. Grep exhaustif sur `metadata/edit` dans `src/dashboard-app/routes/get-route.map.tsx` : 18 occurrences, pas une seule sur un line item. La Sélection sera donc **non éditable en admin**, quoi qu'il arrive.

3. **Rien ne l'affiche.** Grep `metadata` sur tout `src/routes/orders/order-detail/` : **une seule occurrence**, `constants.ts:21` — et c'est `"metadata"` dans les propriétés de la *commande*. Le récapitulatif des lignes n'en montre rien.

**La bonne nouvelle, et elle est décisive pour le coût du widget** : la page charge déjà `*items` (`src/routes/orders/order-detail/constants.ts:47`), et le `*` embarque toutes les colonnes de la ligne, **`metadata` comprise**. Le widget est donc **sans appel réseau** — exactement comme celui du créneau (ADR 0004), et le repo en a déjà un pour modèle (`apps/backend/src/admin/widgets/order-pickup-slot.tsx`). La Sélection est aussi dans le dump JSON (`order-detail.tsx:76`, `data={order}`), ce qui est un filet, pas une UI.

**Et un quatrième fait, qui tranche la forme des clés.** Même là où l'édition de metadata existe, le formulaire **refuse les valeurs non primitives** :

```tsx
// @medusajs/dashboard → src/components/forms/metadata-form/metadata-form.tsx:329, 344-351
const EDITABLE_TYPES = ["string", "number", "boolean"]
// …
return Object.entries(metadata).map(([key, value]) => {
  if (!EDITABLE_TYPES.includes(typeof value)) {
    return { key, value: value, disabled: true }      // ← ligne désactivée
  }
```

rendues `{ ... }` ou `[ ... ]` (`:160-166`), avec ce message :

> *« This object contains non-primitive metadata, such as arrays or objects, that can't be edited here. **To edit the disabled rows, use the API directly.** »*
> — `@medusajs/dashboard → src/i18n/translations/en.json:96`

**C'est la troisième raison indépendante de garder les clés plates et primitives**, après le merge shallow (§1.4) et le déterminisme de la dédup (§1.3). Elle ne s'applique pas au line item (qui n'a pas de formulaire du tout), mais elle s'applique **de plein fouet au candidat de Curation par `product.metadata`** (§6.2) — et c'est ce qui le tue.

---

## 6. Comment modéliser la Curation

Rappel de la contrainte, et elle est forte. L'ADR 0001 : *« Chaque composant de Formule liste les Variantes qui y sont autorisées, cochées explicitement une par une. »* Donc : une relation **many-to-many entre un Composant et des `ProductVariant`**, éditable par le restaurateur, et **jamais dérivée** d'une catégorie ou d'un tag.

### 6.1 Candidat 1 — un module custom `formule` + Module Link vers `ProductVariant`

Le modèle qui dit exactement ce que dit le domaine :

```ts
// apps/backend/src/modules/formule/models/formule-composant.ts
import { model } from "@medusajs/framework/utils"

// Composant — one slot inside a Formule the customer must fill.
const FormuleComposant = model.define("formule_composant", {
  id:    model.id({ prefix: "fcomp" }).primaryKey(),
  // The Formule this slot belongs to — the product_id of the Formule Produit.
  formule_product_id: model.text(),
  // Stable key written into line_item.metadata: "entree", "plat".
  key:   model.text(),
  label: model.text(),        // "Entrée"
  rank:  model.number(),      // display order
})
```

```ts
// apps/backend/src/links/formule-composant-variant.ts
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import FormuleModule from "../modules/formule"

// La Curation : les Variantes explicitement autorisées dans ce Composant.
export default defineLink(
  { linkable: FormuleModule.linkable.formuleComposant, isList: true },
  { linkable: ProductModule.linkable.productVariant,   isList: true }
)
```

**Vérifié, pas supposé.** La doc officielle n'documente que le cas `Product` et se contente de dire que *« similar steps can be applied to the `ProductVariant` or `ProductOption` data models »* sans l'expliciter ([docs.medusajs.com/resources/commerce-modules/product/extend](https://docs.medusajs.com/resources/commerce-modules/product/extend)). Le linkable a donc été **inspecté à l'exécution** sur le paquet installé :

```
PRODUCT linkable: product, productCategory, productCollection, productOption,
                  productOptionValue, productTag, productType, productVariant, productImage

productVariant.toJSON():
{ "linkable": "product_variant_id", "primaryKey": "id",
  "serviceName": "product", "field": "productVariant", "entity": "ProductVariant" }
```

`ProductModule.linkable.productVariant` **existe**. Et `defineLink` supporte bien le many-to-many (`isList` des deux côtés) ainsi que des colonnes supplémentaires sur la table de lien (`@medusajs/utils → dist/modules-sdk/define-link.d.ts:29-35` pour `InputOptions.isList`, `:42-52` pour `ExtraOptions.database.extraColumns`).

- **Fidélité au domaine** : ✅ la meilleure. « Coché une par une » *est* une table de lien. Rien n'est dérivé.
- **Sémantique** : ✅ propre. Aucun champ tiers squatté, aucun sens détourné.
- **Argent** : ✅ aucun. La table de lien ne porte pas de prix — et ne doit jamais en porter (§7).
- **Conforme à AGENTS.md** : ✅ pas d'accès cross-module direct, un Module Link.
- **Coût admin** : ❌ **c'est le prix à payer.** Rien du module custom n'apparaît dans le dashboard. Il faut une page de settings (ou un widget sur le produit) **et** des routes admin pour l'alimenter. Le repo a déjà exactement ce précédent, ce qui rend le coût chiffrable plutôt qu'hypothétique : le module `pickup` a ses modèles (`apps/backend/src/modules/pickup/models/`), ses routes (`src/api/admin/pickup/`), sa page (`src/admin/routes/settings/pickup/page.tsx`) et ses composants (`src/admin/components/pickup/`).

### 6.2 Candidat 2 — `product.metadata`

La colonne existe (`@medusajs/product → dist/models/product.js:93`) et **l'admin sait l'éditer nativement** (`get-route.map.tsx:165`). Tentant : zéro backend, comme le créneau de l'ADR 0004.

**Sauf que la Curation n'est pas un scalaire, et le formulaire refuse les non-scalaires.** Une liste de variantes par composant est *nécessairement* imbriquée :

```json
{ "composants": { "entree": ["variant_A", "variant_B"], "plat": ["variant_C"] } }
```

Or `EDITABLE_TYPES = ["string", "number", "boolean"]` (`metadata-form.tsx:329`) : cette valeur s'affiche `{ ... }`, en ligne **désactivée** (`:345-351`), avec pour seule consigne *« use the API directly »* (`en.json:96`). **L'argument unique du candidat — l'édition native en admin — s'évapore précisément sur la donnée qu'on veut y mettre.** L'ADR 0004 avait gagné parce que `creneau_debut` est une *string*. Une Curation ne l'est pas.

L'aplatir de force (`composant_entree: "variant_A,variant_B"`) rendrait le champ éditable — au prix d'une liste d'IDs opaques séparés par des virgules, saisie à la main, sans autocomplétion, sans validation, sans nom de plat lisible. Le restaurateur devrait connaître les IDs de ses variantes par cœur. Et `mergeMetadata` supprime une clé dont la valeur est `""` (`merge-metadata.js:18-21`) : vider un composant dans le formulaire **supprimerait la clé** au lieu de la vider — pas fatal, mais un piège de plus.

**Écarté.** Non pas parce que ça ne marcherait pas, mais parce que **ça marcherait sans être utilisable** — et l'utilisabilité en admin était le seul argument.

### 6.3 Candidat 3 — une `ProductCategory` par composant

Créer une catégorie « Entrées de formule », y ranger les produits autorisés. Natif, admin-éditable, avec une vraie UI d'association.

**Deux raisons de refuser, la seconde rédhibitoire :**

1. **Une catégorie range des `Product`, pas des `ProductVariant`.** Le modèle `ProductCategory` a `products` (many-to-many vers `Product`), pas `variants`. Or l'ADR 0001 est explicite : *« Une Sélection référence une Variante, jamais un Produit — "Samoussas" n'est pas quelque chose qu'une cuisine peut cuire ; "Samoussas Bœuf", si. »* Une curation par catégorie ne peut pas exprimer « Samoussas Bœuf oui, Samoussas Légumes non ». **Elle est structurellement incapable de dire ce que le domaine demande.**
2. **Les catégories sont déjà prises.** CONTEXT.md : *« Entrée / Plat / Dessert / Boisson : les sections dans lesquelles une Carte est organisée. […] Correspondent aux `ProductCategory` de Medusa. »* Réutiliser le mécanisme pour la curation créerait deux arbres de catégories qui se ressemblent — l'un qui structure la carte, l'autre qui contraint les formules — et le premier restaurateur qui range un plat dans le mauvais le changerait de formule sans le savoir. **C'est précisément le mode d'échec invisible que l'ADR 0001 voulait éviter.**

**Écarté**, et c'est le candidat le plus dangereux du lot : il a l'air natif et propre, et il perd la granularité Variante en silence.

### 6.4 Candidat 4 — les Product Options / `ProductOptionValue` détournées

L'idée : la Formule porte une Option « Entrée » dont les *values* sont les entrées autorisées. Séduisant parce que c'est le mécanisme natif du « choix ».

**Trois obstacles :**

1. **Une `ProductOptionValue` est un libellé, pas une référence.**

```js
// @medusajs/product → dist/models/product-option-value.js:6-17
.define("ProductOptionValue", {
    id: utils_1.model.id({ prefix: "optval" }).primaryKey(),
    value: utils_1.model.text().translatable(),          // ← ligne 8 : du texte libre
    metadata: utils_1.model.json().nullable(),
    option: utils_1.model.belongsTo(() => index_1.ProductOption, { mappedBy: "values" }).nullable(),
    variants: utils_1.model.manyToMany(() => index_1.ProductVariant, { mappedBy: "options" }),
})
```

Le `value` est du texte. Sa relation `variants` (`:15-17`) ne désigne **pas** les variantes *proposées* dans le slot — elle désigne les variantes **de la Formule elle-même** qui portent cette valeur d'option. Ce n'est pas la même relation, et c'est le cœur du malentendu. Pour référencer une variante d'entrée, il faudrait écrire son ID dans `value` (texte affiché au client…) ou dans `metadata`. **Détournement pur.**
2. **L'unicité mord.** Index unique sur `(option_id, value)` (`:19-25`) — gérable, mais c'est le signe qu'on utilise le modèle à contre-emploi.
3. **Les Options appellent la matrice, et l'ADR 0001 l'a rejetée.** En Medusa, une Variante *est* la combinaison des valeurs d'options. Une Formule à Variante unique portant deux Options à 8 et 12 valeurs serait un objet incohérent : 96 combinaisons possibles, une seule variante. L'admin, qui construit la matrice, ne saurait pas quoi en faire. Et CONTEXT.md prévient déjà : *« Éviter : Option (en Medusa une Option est l'**axe** du choix […] et la Variante est la combinaison) »*.

**Écarté.** L'ADR 0001 a déjà tranché la matrice ; ce candidat en est la porte dérobée.

### 6.5 Candidat 5 — Collections / Tags

Mêmes défauts que la catégorie, en moins bien : `ProductCollection` et `ProductTag` s'appliquent aux **`Product`**, pas aux Variantes (même échec que §6.3, point 1), et un produit n'a **qu'une seule** collection. Un tag `formule-midi-entree` serait un peu plus souple, mais reste au niveau Produit, et c'est une curation qu'on lit en filtrant — donc **dérivée**, ce que l'ADR 0001 refuse explicitement. **Écartés.**

### 6.6 Tableau comparatif — la Curation

| | 1. module + link | 2. `product.metadata` | 3. ProductCategory | 4. Options détournées | 5. Collections/Tags |
|---|---|---|---|---|---|
| Granularité **Variante** (ADR 0001) | ✅ | ✅ | ❌ **Produit only** | ➖ via détournement | ❌ **Produit only** |
| Curation explicite, non dérivée | ✅ | ✅ | ➖ | ✅ | ❌ dérivée d'un filtre |
| Éditable en admin sans code | ❌ | ❌ **non primitif désactivé** `metadata-form.tsx:329` | ✅ | ➖ | ✅ |
| Utilisable par un restaurateur | ✅ (après UI) | ❌ IDs à la main | ✅ | ❌ | ✅ |
| Ne collisionne pas avec la Carte | ✅ | ✅ | ❌ catégories déjà prises | ✅ | ➖ |
| Ne réintroduit pas la matrice | ✅ | ✅ | ✅ | ❌ | ✅ |
| Interrogeable / typé | ✅ | ❌ JSON | ✅ | ➖ | ✅ |
| Coût | module + link + routes + UI | ~0 | ~0 | — | ~0 |
| Verdict | **retenu** | écarté | écarté | écarté | écartés |

**Le tableau dit une chose inconfortable : sur la Curation, il n'y a pas d'option gratuite.** Les trois candidats gratuits échouent tous sur la même contrainte de l'ADR 0001 — la granularité Variante et la curation explicite. C'est l'inverse exact de la situation de l'ADR 0004, où `order.metadata` gagnait *parce qu'il était gratuit et natif*. Ici, gratuit signifie faux.

---

## 7. Recommandation

> **Curation : un module custom `formule` + un Module Link vers `ProductVariant`.
> Sélection : `line_item.metadata`, en clés plates et primitives, validée dans les hooks `validate` de `addToCartWorkflow` et de `completeCartWorkflow`.**

Les deux moitiés sont asymétriques, et c'est voulu : **la Curation est une donnée d'administration, rare, éditée par un humain, et qui doit être juste ; la Sélection est une donnée transactionnelle, massive, écrite par une machine, et qui doit suivre sa ligne.** Elles n'ont pas les mêmes contraintes, elles n'ont pas la même réponse.

Rédigé pour un ADR :

**Décision — Curation.** Un module `formule` détient les Composants (`formule_product_id`, `key`, `label`, `rank`). La liste des Variantes autorisées dans un Composant est une table de lien `defineLink(FormuleModule.linkable.formuleComposant, ProductModule.linkable.productVariant)` avec `isList` des deux côtés (`define-link.d.ts:29-35`). `ProductModule.linkable.productVariant` a été vérifié à l'exécution sur le paquet installé (§6.1). Aucune colonne de prix sur la table de lien, jamais.

**Décision — Sélection.** Une clé plate par Composant sur `line_item.metadata`, écrite via `POST /store/carts/:id/line-items` (`validators.js:58`) :

```ts
metadata: {
  formule_entree_variant_id: "variant_01J…",
  formule_plat_variant_id:   "variant_01K…",
}
```

Une clé par composant, valeur = l'ID de la Variante choisie, **string, jamais objet ni tableau**. `completeCartWorkflow` la recopie verbatim sur la ligne de commande (`prepare-line-item-data.js:54`, via `complete-cart.js:346` et `:402`).

**Pourquoi `line_item.metadata` — et pourquoi ce n'est pas le piège de l'ADR 0004.**

- **Le piège n'existe pas, et c'est prouvé.** §1 : la déduplication de lignes existe (`get-line-item-actions.js:58-61`) et fusionnerait deux Formules en une ligne `quantity: 2` — sauf qu'elle est **explicitement indexée sur la metadata en comparaison profonde** (`:50-57`), ce que le commentaire de Medusa dit lui-même (`:60`), et que l'exécution confirme (§1.3). La différence avec `shipping_methods[].data` est structurelle : `data` était **transporté sans être lu** ; `metadata` **fait partie de l'identité de la ligne**. Et là où ne pas renvoyer `data` *effaçait* le créneau, ne pas renvoyer `metadata` **préserve** la Sélection (`is-present.js:17-19` — `{}` n'est pas `isPresent`, donc n'écrase rien). Le champ ne fait pas que survivre : il fait le bon choix par défaut.
- **La chaîne est prouvée de bout en bout** (§2), et cette recherche **ferme la question que l'ADR 0004 avait laissée ouverte** sur `cart.items[].metadata → order.items[].metadata` (`2026-07-14-medusa-pickup-et-creneaux.md:788`). La réponse est `prepare-line-item-data.js:54`.
- **La Sélection est disponible *synchrone* au moment de `order.placed`.** C'est ce qui disqualifie le module lié (§3.3) aujourd'hui : le Ticket cuisine part sur cet événement, et un ticket émis avant que les Sélections ne soient écrites est un ticket faux. La recherche du 2026-07-16 sur le Ticket cuisine avait posé cette question ouverte — *« savoir où vit une Sélection sur la ligne de commande est un prérequis au ticket »* (`2026-07-16-medusa-notification-commande-ticket-cuisine.md:365`). **Elle est levée** : le subscriber lit `items.metadata` en ajoutant `"items.metadata"` à son `fields` (`apps/backend/src/subscribers/order-confirmation.ts:27-52`), et la Store API le donne déjà par défaut au storefront (`store/orders/query-config.js:53`).
- **Aucun euro n'entre nulle part.** La Sélection est une paire clé/string. C'est le candidat A, et lui seul avec le module lié, qui respecte l'invariant de l'ADR 0001 sans effort. Les adjustments le violent par construction (`line-item-adjustment.js:13, 34` — `amount` non nullable, contrainte `>= 0` en base) ; les lignes enfants le violent en posant un prix de 0 €, qui est un prix.

**Pourquoi les clés plates — trois raisons indépendantes, et c'est ce qui rend la règle solide.**

1. **`mergeMetadata` est plat** et écrase un objet imbriqué en bloc (`merge-metadata.js:15-33`). C'est la raison de l'ADR 0004, et elle vaut ici aussi.
2. **La dédup devient non déterministe si la Sélection est un tableau.** `deepEqualObj` est sensible à l'ordre des tableaux (§1.3, vérifié) : deux Formules aux mêmes choix sérialisés dans un ordre différent feraient deux lignes au lieu d'une. Les clés plates n'ont pas d'ordre (`deep-equal-obj.js:19-22`).
3. **L'admin refuse d'éditer une valeur non primitive** (`metadata-form.tsx:329, 345-351` ; *« use the API directly »*, `en.json:96`). Sans effet sur le line item (qui n'a pas de formulaire), mais c'est la règle de la maison — et c'est ce qui tue la Curation par `product.metadata` (§6.2).

**Pourquoi le module custom sur la Curation, alors que l'ADR 0004 a refusé un module pour le créneau.** La question mérite d'être posée frontalement, parce que la décision a l'air contradictoire. Elle ne l'est pas : **l'ADR 0004 a refusé un module parce qu'`order.metadata` faisait le travail — il était gratuit *et* natif en admin *et* fidèle au domaine (« un créneau est un label »). Ici, aucun candidat gratuit n'est fidèle au domaine.** Les catégories, collections et tags perdent la granularité **Variante**, que l'ADR 0001 a rendue non négociable (*« "Samoussas" n'est pas une commande, "Samoussas Bœuf" si »*) ; `product.metadata` la garde mais devient inéditable là où elle est censée être éditée. Le module n'est pas un luxe d'architecture, c'est **le seul candidat qui sait dire ce que le domaine dit**. Et ADR 0001 a déjà accepté d'en payer le prix en écrivant que la curation serait *« une corvée permanente et délibérée »* : une corvée a besoin d'un formulaire.

**Ce que la décision engage aussi (les corollaires non négociables).**

- **Le validateur serveur, aux deux hooks** (§4). `addToCartWorkflow.hooks.validate` (`add-to-cart.d.ts:69-72`) pour l'erreur utile au client ; `completeCartWorkflow.hooks.validate` (`complete-cart.d.ts:248`) pour le contrôle qui compte — le hook reçoit `cart.items[].metadata` (`complete-cart.js:292-295` + `fields.js:114`). Il vérifie que **chaque variante choisie appartient à la Curation de son composant**. **Ce n'est pas optionnel** : `metadata` est un champ que le client contrôle (`validators.js:58`), et sans ce contrôle la Curation n'est qu'une suggestion d'UI — c'est-à-dire exactement le « plat premium qui apparaît silencieusement dans une formule à prix fixe » que l'ADR 0001 a écrit noir sur blanc vouloir empêcher. **Ne pas compter sur `additional_data` : il est retiré silencieusement par zod sur ces routes** (vérifié par exécution, §4), et `line-items/route.js:13` est du code mort.
- **Un widget admin sur `order.details.before`**, sans quoi la Sélection **n'est visible nulle part** sauf dans le dump JSON (§5) : la carte Metadata ne lit que la commande (`metadata-section.tsx:21-25`), et aucune route native n'édite la metadata d'un line item (grep exhaustif de `get-route.map.tsx`). Coût réel : ~20 lignes, **aucun appel réseau** — la page charge déjà `*items` (`order-detail/constants.ts:47`). Le repo a le modèle exact : `apps/backend/src/admin/widgets/order-pickup-slot.tsx`. Sans lui, CONTEXT.md est faux quand il dit que *« la liste des commandes de l'admin Medusa est la source de vérité »* : le restaurateur ne verrait pas ce qu'il doit cuire.
- **Une UI d'administration de la Curation.** C'est le gros du coût, et il faut l'assumer plutôt que le découvrir. Précédent chiffrable dans le repo : le module `pickup` (modèles, routes `src/api/admin/pickup/`, page `src/admin/routes/settings/pickup/page.tsx`, composants). Elle doit lister les Variantes par **nom lisible**, pas par ID — sinon on aura reconstruit `product.metadata` avec plus d'étapes.
- **La clé du Composant est un contrat.** `formule_composant.key` (`"entree"`) est ce qui apparaît dans `line_item.metadata` (`formule_entree_variant_id`). Renommer une clé après la première commande **orpheline les Sélections déjà passées** — les commandes sont figées, la Curation non. Traiter `key` comme immuable après création.

**Ce qui est explicitement rejeté** : les **adjustments** (`line-item-adjustment.js:13, 34` — `amount` non nullable + contrainte SQL `>= 0` : *un adjustment est de l'argent par construction*, l'ADR 0001 le disqualifie sans discussion), les **catégories/collections/tags** pour la Curation (granularité Produit, pas Variante — et les catégories sont déjà la structure de la Carte), les **Options détournées** (porte dérobée vers la matrice que l'ADR 0001 a rejetée), et **`product.metadata`** (son unique argument — l'édition native — s'évapore exactement sur les valeurs non primitives qu'une Curation exige : `metadata-form.tsx:329`).

**Le coût de sortie, et le déclencheur.** Le point faible connu de `line_item.metadata` n'est ni la perte ni la falsification (§1, §4 les ferment) — c'est **l'absence de requête**. On ne peut pas demander « combien de Menus Midi avec Samoussas Bœuf ce mois-ci ». Comme pour le créneau, cette requête n'existe pas encore : les commandes sont same-day (CONTEXT.md, *Commandes fermées*), et le service se compte en dizaines de lignes. Le jour où elle existera, la Sélection migre vers le candidat C (§3.3) : un modèle `formule_selection` lié au line item de commande. **La migration est un script qui lit `order.items[].metadata.formule_*_variant_id` sur les commandes existantes** — les clés plates d'aujourd'hui sont les colonnes de demain, et `formule_composant.key` est déjà la jointure. Rien de ce qui est écrit ici n'est à jeter. Nommer le déclencheur maintenant, pour que le déménagement se fasse exprès : **le jour où l'on veut compter les Sélections à travers plusieurs services** — un tableau de popularité des composants, une prévision d'achats. Pas avant : une base de données n'a pas besoin d'index pour trier trente lignes.

Et le déclencheur de l'autre moitié, celui qui renverrait à l'ADR 0001 : **le jour où le prix cesse d'être plat.** L'ADR 0001 le dit déjà — *« si le prix cesse un jour d'être plat, [la matrice de variantes] redevient la bonne réponse : la metadata ne peut pas exprimer un prix qui varie avec le choix »*. Une Sélection en metadata est **structurellement incapable** de porter un supplément. C'est une propriété, pas un défaut : le jour où quelqu'un voudra faire payer +2 € le magret dans le Menu Midi, il **ne pourra pas** le bricoler dans `line_item.metadata` sans mettre un prix hors du pricing engine — et il devra rouvrir l'ADR 0001. CONTEXT.md a déjà nommé ce moment (*Supplément*, § « Not in the domain ») : *« ce serait le premier concept à mettre un prix en dehors du pricing engine de Medusa, donc s'il arrive un jour, il lui faut une décision délibérée, pas un champ ad-hoc. »* **La décision recommandée ici rend ce bricolage impossible plutôt qu'inconfortable.** C'est son meilleur trait.

---

## 8. Questions ouvertes et non-vérifiés

**Explicitement non vérifié :**

- **Aucune requête n'a été exécutée contre une vraie base** (pas de Postgres dans cette session). Tout ce qui touche à la persistance est lu dans le code ou exécuté en pur JS (§1.3, §4, §6.1). Le comportement de `getLineItemActionsStep` sur une base réelle dépend de `listLineItems({ cart_id, variant_id })` (`get-line-item-actions.js:28-40`), dont je n'ai vérifié que le `select`. **Le premier test d'intégration à écrire est celui-là** : ajouter deux fois la même Formule avec deux Sélections différentes et compter les lignes. C'est exactement le genre de test que `medusaIntegrationTestRunner` sert (AGENTS.md, § *Tests*), et il vaut plus que tout ce document.
- **Le comportement de la dédup quand la Curation change entre deux ajouts.** Si le client ajoute la Formule, que le restaurateur retire un plat de la Curation, et que le client l'ajoute à nouveau avec la même Sélection : les lignes fusionnent (metadata identique) et `completeCartWorkflow.hooks.validate` rejettera **les deux**. C'est le comportement souhaitable, mais **je ne l'ai pas exécuté**, et le message d'erreur à montrer au client est une décision d'UX non prise.
- **L'affichage de `line_item.metadata` dans le dump JSON de l'admin.** Déduit de `data={order}` + `showJSON` (`order-detail.tsx:75-76`) et de `*items` (`constants.ts:47`), **pas observé dans un navigateur**. Sans conséquence : le widget est de toute façon requis (§5).
- **La forme exacte de l'UI de Curation.** §6.1 donne le modèle et le lien, pas l'écran. Le choix « page de settings » vs « widget sur la fiche produit de la Formule » n'est pas tranché ici — le second est probablement meilleur (la Curation est une propriété de la Formule, pas une configuration globale comme les Horaires de retrait), mais ça se discute et ça n'a pas été instruit.

**À décider (hors périmètre de cette recherche) :**

- **Où vit la définition « ce Produit est une Formule » ?** `formule_composant.formule_product_id` (§6.1) le déduit par existence d'au moins un composant. C'est implicite. Un modèle `Formule` explicite lié au Produit serait plus lisible et donnerait un endroit où poser le libellé et le rang. Ça vaut trente minutes de réflexion avant d'écrire la première migration.
- **Le nommage des clés de metadata.** `formule_entree_variant_id` est verbeux mais lisible dans un dump JSON — et l'ADR 0004 a déjà arbitré dans ce sens pour `creneau_debut`/`creneau_fin`, au motif que l'admin est la source de vérité. Rester cohérent. Mais noter la tension : ces clés sont **du français dans du code**, comme `creneau_debut`. AGENTS.md impose l'anglais pour les identifiants et les contrats d'API ; l'ADR 0004 a créé le précédent inverse sur un contrat de wire. **Trancher explicitement plutôt que d'hériter du précédent par inadvertance.**
- **Que fait-on d'une Sélection dont la Variante a été supprimée** entre la commande et la lecture du Ticket cuisine ? La metadata garde un ID mort ; le ticket doit afficher *quelque chose*. Dénormaliser le **nom** de la variante à côté de son ID (`formule_entree_label: "Samoussas Bœuf"`) rendrait le ticket robuste et lisible sans jointure — au prix d'une clé de plus et d'une dénormalisation. Le nom est **déjà** dénormalisé sur la ligne elle-même par Medusa (`prepare-line-item-data.js:32-46` : `title`, `variant_title`, `product_title`…), donc le précédent est natif et l'argument est fort. **Non tranché** — mais c'est le prolongement le plus utile de cette note, et il concerne directement le Ticket cuisine.
