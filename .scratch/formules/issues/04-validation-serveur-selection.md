# 04 — Le serveur rejette une Sélection invalide, à l'ajout et au paiement

**Spec :** [docs/specs/formules.md](../../../docs/specs/formules.md) — § « La validation serveur, aux deux hooks déjà nommés par l'ADR 0005 », § « Le message d'erreur au client, et sa récupération », § Testing Decisions « Seam 1 »
**ADR :** [0001](../../../docs/adr/0001-formules-as-flat-priced-produits.md) — la Curation protège la marge, ce n'est pas une suggestion d'UI ; [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) — les deux hooks `validate`

**Status:** ready-for-agent

**Blocked by:** 02 (le chemin d'écriture doit exister), 03 (la persistance jusqu'à la commande doit être prouvée avant d'en garantir la correction).

## What to build

`line_item.metadata` est écrit par le client via une route publique : sans revérification serveur, la Sélection n'est qu'une suggestion d'UI, pas une garantie. N'importe quelle Variante de la Carte pourrait se faire passer pour un choix curé — y compris le plat le plus cher — et c'est exactement le risque que la Curation explicite de l'ADR 0001 était censée fermer.

**La fonction de contrôle**, pure, testée en isolation (Seam 1) : étant donné la Curation d'une Formule (Composants → Variantes autorisées) et une Sélection soumise, elle dit valide ou renvoie le motif de rejet. Cas couverts, de façon exhaustive : Composant manquant, clé de Sélection qui ne correspond à aucun Composant, Variante hors Curation **du Composant visé** mais valide pour un autre Composant de la même Formule (le cas qui protège la marge — pas assez de vérifier que la Variante appartient à *une* Curation de la Formule, il faut vérifier celle *du bon Composant*), Sélection posée sur une ligne dont la Variante n'est pas une Formule.

**Deux points d'accroche, pour deux raisons différentes.** `addToCartWorkflow.hooks.validate` (et son équivalent sur `updateLineItemInCartWorkflow`) rejette immédiatement — c'est l'erreur exploitable par le client au moment où il peut la corriger. `completeCartWorkflow.hooks.validate` **existant** (`src/workflows/hooks/complete-cart.ts`, qui revalide déjà le Créneau) est étendu pour revalider aussi la Sélection — un seul hook `validate` par workflow, pas un second en parallèle. C'est le contrôle qui compte : la Curation a pu changer entre l'ajout au panier et le paiement.

**La récupération côté client.** Quand le paiement est rejeté pour une Sélection devenue invalide, le message identifie quel Composant de quelle Formule est en cause, et le storefront permet de corriger la Sélection sans recommencer tout le panier — même principe de récupération gracieuse que la feature récente sur l'expiration du Créneau au paiement.

## Acceptance criteria

- [ ] Une fonction pure de contrôle Sélection-contre-Curation existe, testée unitairement (sans base) sur : Composant manquant, clé en trop, Variante hors Curation de son Composant mais valide pour un autre, Sélection sur une Variante qui n'est pas une Formule
- [ ] `addToCartWorkflow.hooks.validate` (et l'équivalent sur `updateLineItemInCartWorkflow`) rejette une Sélection incohérente à l'ajout, avec un message exploitable par le client
- [ ] Le hook `validate` existant de `completeCartWorkflow` est étendu (pas dupliqué) pour revalider la Sélection contre la Curation **au moment de la complétion**
- [ ] Le rejet à la complétion intervient avant l'autorisation du paiement : aucun paiement n'est capturé pour une commande refusée
- [ ] Le storefront affiche, au rejet, un message identifiant le Composant et la Formule en cause, et permet de corriger la Sélection sans recommencer le panier
- [ ] Tests d'intégration HTTP sur `POST /store/carts/:id/complete` : une Sélection invalide est rejetée avant capture du paiement (le `payment_collection.payment_sessions[0].status` reste `"pending"`)
- [ ] Les tests interrogent les routes et regardent ce qui a été rejeté ou persisté ; ils n'assertent ni sur les méthodes internes du module, ni sur l'ordre des étapes du workflow
