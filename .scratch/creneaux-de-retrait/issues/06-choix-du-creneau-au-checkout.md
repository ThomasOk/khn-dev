# 06 — Le client choisit son créneau dans l'étape de retrait

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « Le checkout »
**ADR :** [0004](../../../docs/adr/0004-creneau-in-order-metadata.md) — le créneau vit dans `order.metadata`

**Status:** ready-for-agent

**Blocked by:** 01 (l'option de retrait doit exister), 04 (la route doit servir des créneaux).

## What to build

Aujourd'hui le tunnel se termine sur « Retrait au restaurant », sans heure. Après ce ticket, le client choisit **quand** il vient chercher sa commande, et ne peut pas payer sans l'avoir fait.

Le choix du créneau vit **dans l'étape de retrait** (`?step=delivery`), **pas dans une étape à part** : dès que l'option de retrait est sélectionnée, la liste des créneaux s'ouvre en dessous. Une seule étape répond à « où et quand je récupère » — le client a faim, on ne lui fait pas traverser une étape de plus.

Le bouton « passer au paiement » reste **désactivé tant qu'aucun créneau n'est choisi** : le client ne doit pas découvrir son oubli au moment de payer.

## Les deux clés plates, et pourquoi

Le créneau est écrit sur le panier en **deux clés plates de premier niveau** :

```
metadata.creneau_debut   // "2026-07-14T12:15:00+02:00"
metadata.creneau_fin     // "2026-07-14T12:30:00+02:00"
```

**Plates, impérativement.** Le merge de metadata de Medusa est **plat** : un objet imbriqué (`metadata.creneau = { debut, fin }`) serait écrasé **en bloc** à la prochaine écriture, pas fusionné. Ce piège ne produit aucune erreur — il produit une feature qui a l'air de marcher.

**Deux instants** plutôt qu'un début et une durée, parce que l'admin affiche le metadata en JSON brut et que l'admin est la source de vérité : deux instants se lisent tels quels.

Le passage panier → commande est **natif** : le workflow de complétion recopie `cart.metadata` sur `order.metadata` verbatim. Aucun module, aucun lien, aucune route Store custom pour l'écriture (ADR 0004).

## Ce que l'ADR 0004 rejette, et qu'on réinventera dans six mois

**Ne pas stocker le créneau dans `shipping_methods[].data`.** Ça marche sans une ligne de backend, et c'est exactement ce qui le rend dangereux : le workflow d'ajout de shipping method **supprime puis recrée** les méthodes qui collident, et le storefront ne renvoie jamais `data`. Un client qui revient en arrière et re-clique sur l'option de retrait **perd son créneau en silence** — aucune erreur, aucun log, une commande sans heure. C'est le piège que l'ADR 0004 rejette explicitement, et c'est l'approche que quelqu'un proposera « parce qu'elle marche ».

## Contraintes déjà établies

- **Une option de retrait ne remonte que si le panier a une adresse** : la service zone filtre sur le `country_code` de l'adresse. L'étape adresse doit donc rester avant l'étape retrait — c'est déjà l'ordre du tunnel. Pas d'adresse ⇒ pas d'option de retrait ⇒ pas de créneau.
- Le storefront parle au backend via la **couche SDK existante**, pas par un `fetch()` nu (la clé publiable ne partirait pas).
- **Chaque rendu passe explicitement `timeZone: "Europe/Paris"`** au formateur. Sans cette précision, un client dont le téléphone est réglé sur Londres lirait « 11h15 » pour le créneau de 12h15 et **arriverait une heure trop tôt**. La recherche désigne ce point comme le bug le plus probable de la fonctionnalité.

## Acceptance criteria

- [ ] Dès que l'option de retrait est sélectionnée, la liste des créneaux offrables s'ouvre **dans la même étape** — aucune étape supplémentaire dans le tunnel
- [ ] Choisir un créneau écrit `creneau_debut` et `creneau_fin` **à plat** dans `cart.metadata`, en ISO 8601 avec offset
- [ ] Le bouton de passage au paiement est **désactivé** tant qu'aucun créneau n'est choisi
- [ ] Le créneau choisi **survit à un retour en arrière** dans le tunnel et à un re-clic sur l'option de retrait : il reste affiché comme choisi, et il est toujours sur le panier (c'est le piège que l'ADR 0004 rejette)
- [ ] Les heures affichées passent explicitement `timeZone: "Europe/Paris"` : un navigateur réglé sur un autre fuseau affiche les mêmes heures qu'un navigateur français
- [ ] Vérification à la main : aucune infra de test React n'est mise en place ici
