# 02 — Une seule à la fois : le chevauchement refusé

**What to build:** Il n'y a jamais qu'une Annonce à l'écran, et le restaurateur l'apprend **au moment où il la saisit**, pas en la cherchant sur le site.

Publier une Annonce dont la Période d'annonce croise celle d'une autre échoue, avec un message qui nomme la période en conflit. Deux périodes qui se **touchent** sans se croiser — l'une finit le 10, l'autre commence le 11 — sont parfaitement acceptables et doivent passer. Modifier une Annonce sans la déplacer passe aussi : elle ne se chevauche qu'elle-même.

Ce ticket livre en même temps la modification et la suppression, parce que la modification est précisément l'endroit où le contrôle de chevauchement est subtil (il faut s'exclure soi-même) et qu'elles n'ont pas de sens l'une sans l'autre.

Pourquoi refuser plutôt que départager silencieusement : une Annonce publiée qui ne s'affiche jamais n'est **pas diagnosticable depuis le storefront**. C'est le mode de panne qu'on refuse d'acheter.

La modification n'existe pas sur `pickup/closures`, qui n'offre que création et suppression. La divergence est voulue : une faute dans une bannière publique, non fermable, affichée sur toutes les pages, doit se corriger en dix secondes sans retaper le reste.

**Blocked by:** 01 — L'Annonce, de l'API à la bannière.

**Status:** ready-for-agent

- [ ] La création et la modification passent par un **workflow**, pas par de la logique enchaînée dans la route (`AGENTS.md`), sur le modèle de `createPickupClosureWorkflow`
- [ ] Le test de chevauchement est une comparaison de chaînes `YYYY-MM-DD` : `existante.start_date <= candidate.end_date` **et** `existante.end_date >= candidate.start_date`. Aucun `Date` construit
- [ ] La modification s'exclut elle-même du contrôle
- [ ] Un conflit répond **409**, avec un message nommant la période en conflit
- [ ] `POST /admin/announcements/:id` (modification) et `DELETE /admin/announcements/:id`
- [ ] Test d'intégration HTTP : chevauchement partiel refusé
- [ ] Test d'intégration HTTP : inclusion totale d'une période dans une autre refusée
- [ ] Test d'intégration HTTP : périodes identiques refusées
- [ ] Test d'intégration HTTP : **adjacence acceptée** — une Annonce finissant le 10, la suivante commençant le 11
- [ ] Test d'intégration HTTP : modifier l'accroche d'une Annonce sans toucher à sa période est accepté
- [ ] Test d'intégration HTTP : déplacer une Annonce sur la période d'une autre est refusé en 409
- [ ] Test d'intégration HTTP : après suppression, l'Annonce n'est plus servie par la route store
