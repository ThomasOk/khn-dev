# 01 — Le seed crée une option de retrait

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « Le seed : prérequis bloquant »

**Status:** ready-for-agent

**Blocked by:** Aucun — peut démarrer immédiatement.

## What to build

Le restaurateur ne vend que du retrait, mais le seed hérité du starter ne crée qu'un fulfillment set de **livraison**. Résultat : l'étape de retrait du tunnel de commande n'a aucune option à proposer, et rien du reste de la feature n'a de surface sur laquelle exister.

Après ce ticket, un client qui arrive à l'étape de retrait voit « Retrait au restaurant » et peut le choisir. C'est le prérequis bloquant du slice : sans option de retrait, pas d'étape, donc pas de créneau.

Deux choses rendent ce ticket immédiatement démontrable et méritent d'être sues avant de commencer :

- **L'UI de retrait existe déjà** côté storefront (héritage du starter Medusa) : l'étape de retrait filtre déjà les options sur `fulfillment_set.type === "pickup"` et sait afficher un bloc de retrait complet. Il n'y a **aucune UI à écrire ici** — le seed allume une surface déjà en place.
- **Le backend n'a pas de script `seed`.** `turbo.json` déclare la tâche et la racine expose `pnpm backend:seed`, mais le backend ne définit le script nulle part : la commande ne lance donc **rien, en silence** — exactement la même panne que le script `test` manquant (ticket 02). Le seed est aujourd'hui un script `medusa exec` qu'il faut lancer à la main. Ce ticket le rend appelable par la commande annoncée, sinon personne ne peut rejouer le seed pour vérifier quoi que ce soit.

## Trois valeurs à ne pas se tromper

Les trois échouent **en silence** — aucune erreur, juste une option qui n'apparaît jamais :

- `type` vaut **exactement `"pickup"`**. La doc officielle de Medusa donne l'exemple `"pick-up"` avec un tiret : **c'est un piège**. Avec le tiret, l'admin ne reconnaît pas le set comme un set de retrait et le filtre du storefront ne matche rien.
- La service zone a besoin d'une **geo zone `fr`**, même si rien n'est jamais expédié : c'est elle qui fait remonter l'option jusqu'au storefront (la zone filtre sur le `country_code` de l'adresse du panier).
- Provider `manual_manual`, prix **0**, et les deux règles `enabled_in_store = "true"` et `is_return = "false"`. Sans la première, l'option n'apparaît jamais côté client.

## Acceptance criteria

- [ ] Le seed crée un fulfillment set de retrait dont le `type` est la chaîne exacte `"pickup"`, avec une service zone portant une geo zone `fr`
- [ ] L'option de retrait est en provider `manual_manual`, à prix 0, avec les règles `enabled_in_store = "true"` et `is_return = "false"`
- [ ] `pnpm backend:seed` depuis la racine exécute réellement le seed (le script `seed` manquant du backend est ajouté) et ne se termine plus en silence sans rien faire
- [ ] Après un seed sur une base vierge, l'étape de retrait du tunnel affiche l'option de retrait et le client peut la sélectionner — sans qu'une ligne d'UI ait été écrite
- [ ] L'admin Medusa reconnaît le set comme un set de retrait (c'est le contrôle qui attrape la faute de frappe `"pick-up"`)
