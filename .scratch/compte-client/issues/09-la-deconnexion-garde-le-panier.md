# 09 — La déconnexion garde le panier

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Stories 20, 21 ; § « Storefront — la déconnexion, la francisation »
**ADR :** [0012](../../../docs/adr/0012-logout-detaches-the-cart-from-the-customer.md) — « Logout detaches the cart from the customer through a new store route »

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement.

## What to build

Se déconnecter efface aujourd'hui le panier, en silence. Un client qui a composé sa commande depuis la Carte et qui se déconnecte — par réflexe, sur un poste partagé, ou parce qu'il s'est connecté avec le mauvais compte — perd tout, sans avertissement et sans moyen de revenir en arrière.

**Se déconnecter retire l'identité, pas les plats choisis.** Le panier redevient un panier invité et reste commandable jusqu'au paiement, ce qui est le mode normal de ce domaine : commander sans compte est la règle, pas la dégradation.

Le comportement actuel vient du starter et se défend sur un poste partagé — le suivant ne doit pas hériter du panier du précédent. Mais il se défend moins bien qu'il ne coûte : le partage de poste est rare, la déconnexion accidentelle ne l'est pas, et la perte est silencieuse dans les deux cas.

Le mouvement inverse fonctionne déjà et ne doit pas casser : se connecter alors qu'un panier est composé rattache ce panier au client. Ce ticket ne touche pas à ce chemin, mais l'aller-retour complet fait partie de ce qu'il doit vérifier.

## Acceptance criteria

- [ ] Se déconnecter avec un panier composé conserve ce panier, intact
- [ ] Le panier conservé reste commandable jusqu'au paiement, en invité
- [ ] Se connecter alors qu'un panier est déjà composé continue de rattacher ce panier au client
- [ ] L'aller-retour complet — composer, se connecter, se déconnecter, commander — ne perd aucune ligne de panier
- [ ] La déconnexion continue de retirer l'identité : le client n'est plus reconnu et son adresse n'est plus pré-remplie
