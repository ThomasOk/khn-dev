# 04 — La route Store expose l'état

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « Le contrat Store : une route dédiée, `revalidate: 60` », § « Testing Decisions / Seam 2 », User Story 39
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md) — § « Why the Carte cannot learn this from `/store/products` » ; [0010](../../../docs/adr/0010-mode-vitrine-is-switched-by-a-human-only.md) — ce que la Carte peut lire sans casser son cache

**Status:** ready-for-agent

**Blocked by:** 02 (le modèle et `isOnCarteAt` doivent exister).

## What to build

Une route Store en lecture seule, sans authentification, qui dit au storefront quels Produits sont hors carte **maintenant** et à quelles heures ils sont servis.

`GET /store/product-availability` renvoie **les seuls Produits ayant au moins une plage active** — une poignée, jamais la Carte entière :

```
{
  availabilities: [
    {
      product_id: string,
      available_now: boolean,
      schedules: [{ day_of_week: number, start_time: string, end_time: string }]
    }
  ]
}
```

Champs en anglais (AGENTS.md). Un Produit **absent** de la réponse n'a aucun horaire et est donc à la carte en permanence : c'est le cas par défaut, et il ne coûte pas un octet. Les lignes `active: false` ne sortent pas — ce que la route expose est ce que le client peut lire (« servi de 11h30 à 14h00 »), pas la saisie de l'admin.

`available_now` est dérivé **côté serveur** par `isOnCarteAt` (ticket 02). Ne pas réimplémenter la règle ici. Les `schedules` bruts accompagnent le booléen pour que la page d'un Produit hors carte (ticket 06) puisse écrire ses heures sans second appel.

**Pourquoi une route dédiée, et pas un filtre dans `/store/products`.** C'est le point où cette feature peut silencieusement ne pas marcher, et l'ADR 0013 le documente pour qu'on ne « simplifie » pas plus tard : la liste des produits est lue côté storefront en `force-cache` avec un tag, et ce cache n'est invalidé que par une écriture produit — **il ne se périmera jamais à 14h00 tout seul**. Un filtre posé là passerait tous les tests manuels en développement, où le cache est froid à chaque rechargement, et ne marcherait jamais en production.

**Pourquoi pas non plus une greffe sur `/store/showcase`**, qui est pourtant déjà lue par la page Carte : le Mode vitrine est *décidé* et suspend la boutique entière, le Hors carte est *dérivé* et concerne un Produit. CONTEXT.md les tient séparés exprès.

## Acceptance criteria

- [ ] `GET /store/product-availability` répond sans authentification
- [ ] Un Produit sans aucun `AvailabilitySchedule` est **absent** de la réponse
- [ ] Un Produit dont une plage active englobe l'instant courant est présent avec `available_now: true` et ses horaires
- [ ] Un Produit dont la seule plage active est passée est présent avec `available_now: false`
- [ ] Une plage `active: false` n'apparaît dans aucun `schedules`, et un Produit dont toutes les plages sont inactives est absent de la réponse
- [ ] `available_now` est calculé par `isOnCarteAt` (ticket 02) — la règle n'est pas réécrite dans la route
- [ ] Aucune modification de `/store/products`
- [ ] Seam 2 (moitié « route ») — tests HTTP d'intégration couvrant les cinq points ci-dessus, en semant les horaires **relativement à l'horloge réelle de Paris** via les helpers partagés, comme le font déjà les specs des Créneaux et de la complétion de panier
- [ ] `pnpm test` passe
