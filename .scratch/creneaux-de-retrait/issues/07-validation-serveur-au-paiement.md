# 07 — Le créneau est re-validé au paiement et survit à la commande

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « La validation serveur », § « Seam 1 »
**ADR :** [0004](../../../docs/adr/0004-creneau-in-order-metadata.md) — le créneau vit dans `order.metadata`

**Status:** ready-for-agent

**Blocked by:** 02 (les tests), 03 (la dérivation).

> ⚠️ **Ce ticket ne dépend pas du ticket 06 et peut avancer en parallèle — mais il ne doit pas atterrir sur `main` avant lui.** Le hook rejette tout panier sans créneau : mergé seul, il rend le tunnel de commande impossible à terminer depuis le site, puisque rien ne permet encore au client d'en choisir un. Ses tests, eux, écrivent le metadata directement et n'ont pas besoin de 06.

## What to build

`cart.metadata` est écrit par le client via une **route publique**. Un créneau qui n'a pas été validé côté serveur n'est donc rien d'autre qu'un **champ que le client contrôle** : il peut s'en fabriquer un, ou en garder un qui a expiré pendant qu'il regardait son écran.

Ce ticket ajoute un hook `validate` sur le workflow de complétion du panier — le **seul hook publiquement typé** de ce workflow, et le seul point qui s'exécute **avant l'autorisation du paiement**. Il **re-dérive** les créneaux offrables à cet instant précis, et rejette avec un `MedusaError` de type `INVALID_DATA` :

- **aucun créneau sur le panier** → message distinct ;
- **créneau qui n'est plus offrable** (passé, sous le Délai, hors Horaires, jour fermé) → message distinct.

Les deux messages doivent être **distincts** : le ticket 08 s'appuie dessus pour ramener le client au bon endroit avec la bonne phrase.

Ce n'est pas une ceinture et bretelles. Un client peut rester **quinze minutes** sur la page de paiement pendant que son créneau expire. Valider au *choix* ne prouve rien ; seul le contrôle à la *complétion* compte. Et la cuisine ne doit **jamais** recevoir une commande dont le créneau est déjà passé — elle cuisinerait pour quelqu'un qui est déjà reparti.

## Le test le plus précieux de la feature

Sur un créneau valide, la commande créée porte `creneau_debut` et `creneau_fin` **verbatim dans son `metadata`**.

C'est ce test, et lui seul, qui vérifie la thèse centrale de l'ADR 0004 — que le créneau **survit réellement** au passage panier → commande — **sur une vraie base**, plutôt que sur une lecture de code. Le passage est natif : le workflow de complétion recopie `cart.metadata` sur `order.metadata`. Aucun module, aucun lien, aucune route custom pour l'écriture.

## Acceptance criteria

- [ ] Un hook `validate` sur le workflow de complétion re-dérive les créneaux offrables **au moment de la complétion**, et non au moment du choix
- [ ] Un panier **sans créneau** est rejeté avec un `MedusaError` `INVALID_DATA` et un message qui lui est propre
- [ ] Un panier dont le créneau **n'est plus offrable** (passé, sous le Délai, hors Horaires, jour fermé) est rejeté avec un `MedusaError` `INVALID_DATA` et un message **distinct du précédent**
- [ ] Le rejet intervient **avant l'autorisation du paiement** : aucun paiement n'est capturé pour une commande refusée
- [ ] Tests d'intégration HTTP sur la complétion du panier : le cas sans créneau, le cas du créneau périmé, et — **le test le plus précieux** — sur un créneau valide, `order.metadata` porte `creneau_debut` et `creneau_fin` **verbatim**
- [ ] Les tests interrogent les routes et regardent ce qui a été persisté ; ils n'assertent ni sur les méthodes internes du module, ni sur l'ordre des étapes du workflow
