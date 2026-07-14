# 09 — Le créneau est visible après paiement : widget admin et page de confirmation

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « L'admin », § « La dérivation, et le fuseau horaire »

**Status:** ready-for-agent

**Blocked by:** 07 (les commandes doivent porter un créneau dans leur `metadata`).

## What to build

Le créneau est écrit sur la commande, validé, persisté — et **personne ne le voit**. Sans ce ticket, il existe mais il finirait par être faux sans qu'on le sache.

Deux surfaces, une seule idée : **afficher le créneau là où la donnée est déjà présente**.

**Le widget admin**, sur la zone `order.details.before` de la page commande : « Retrait — mercredi 15/07, 12h15–12h30 », lu en haut de la page, sans cliquer. Il lit `order.metadata`, **déjà présent dans les props** : **aucun appel réseau**. Le restaurateur le lit sans ouvrir le JSON.

**La page de confirmation**, côté storefront : le client voit le créneau sur lequel il vient de s'engager, et en garde une trace.

## La correction d'un créneau ne demande aucun code

Si un client appelle pour décaler son retrait, le restaurateur le corrige lui-même : **la route d'édition du metadata de la commande existe nativement dans le dashboard Medusa**. Rien à écrire ici. Le client, lui, ne change pas son créneau après paiement — c'est hors périmètre, et c'est le restaurateur qui le fait pour lui.

## Le bug le plus probable de la fonctionnalité

**Chaque rendu passe explicitement `timeZone: "Europe/Paris"` au formateur.** Les deux surfaces de ce ticket en font partie, et le ticket cuisine à venir aussi.

Sans cette précision, un client dont le téléphone est réglé sur Londres lirait **« 11h15 » pour le créneau de 12h15** et **arriverait une heure trop tôt**. Le créneau est transporté en ISO 8601 avec offset ; c'est le **formateur**, et lui seul, qui décide de l'heure lue. Le fuseau du navigateur ne décide de rien. La recherche désigne ce point comme le bug le plus probable de la feature — et il ne lève aucune erreur.

## Acceptance criteria

- [ ] Un widget sur la zone `order.details.before` de la page commande affiche le créneau en clair (jour et plage horaire), lisible sans cliquer et sans ouvrir le JSON
- [ ] Le widget lit `order.metadata` depuis les props : **aucun appel réseau supplémentaire**
- [ ] La page de confirmation du storefront affiche le créneau de la commande qui vient d'être passée
- [ ] Les deux surfaces passent explicitement `timeZone: "Europe/Paris"` au formateur : un navigateur réglé sur Londres affiche **12h15**, pas 11h15
- [ ] Une commande dont le créneau est corrigé via l'édition native du metadata dans le dashboard affiche la **nouvelle** valeur — aucun code de correction n'est écrit
- [ ] Vérification à la main : aucune infra de test React n'est mise en place ici
