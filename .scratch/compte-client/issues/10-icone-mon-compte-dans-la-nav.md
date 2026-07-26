# 10 — L'icône « Mon compte » dans la nav

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Stories 3, 9 ; § « Storefront — le point d'entrée »
**ADR :** [0011](../../../docs/adr/0011-compte-offered-after-the-payment.md) — paragraphe d'ouverture et « What this decision forbids »

**Status:** ready-for-agent

**Blocked by:** 02 (la porte ne s'ouvre pas sur « Become a Medusa Store Member »), 04 et 05 (aucun mot de passe distribué sans moyen de le changer et de le récupérer).

## What to build

**Le ticket qui ouvre la porte, et le dernier du lot.** Ses blocages ne sont pas une commodité d'ordonnancement : ils encodent la contrainte d'ADR 0011 — pas de mot de passe qu'on ne puisse ni changer ni récupérer. Tant que 04 et 05 ne sont pas faits, ce ticket ne doit pas partir, et l'arête de blocage est là pour que ça ne repose pas sur la mémoire de quelqu'un.

Une **icône** à côté de celle du panier, menant à l'espace compte, avec un libellé accessible en français. Pas de libellé texte visible : le Compte est accessoire et ne doit pas peser autant que la Carte et le panier. Un bouton « Créer un compte » poserait la question du compte au client en train de lire la carte — exactement le moment où ADR 0011 a décidé qu'on ne la poserait pas.

Elle reprend le traitement visuel de l'icône de panier existante : même charte, même comportement au survol, même dimension.

**Aucun conditionnel à écrire.** L'espace compte rend déjà la connexion pour un visiteur et le tableau de bord pour un client, par ses routes parallèles. Le même lien sert les deux cas — s'il faut ajouter une condition dans la nav, c'est le signe qu'on est en train de reconstruire ce qui existe.

**L'icône est visible dans tous les états, Mode vitrine compris** : le Compte n'a rien à voir avec la suspension des commandes, et le client connecté reste connecté pendant qu'on ne prend plus de commandes.

**Rien ne devient conditionné par le compte.** La Carte, ses prix, ses boutons d'ajout et le tunnel sont identiques connecté ou déconnecté. C'est le point qu'un lecteur pressé pourrait défaire en croyant bien faire, et c'est pour ça qu'il est en critère d'acceptation.

## Acceptance criteria

- [ ] Une icône « Mon compte » apparaît à côté de l'icône de panier, avec un libellé accessible en français
- [ ] Un visiteur déconnecté qui la suit arrive sur la connexion ; un client connecté arrive sur son compte
- [ ] Aucune condition sur l'état de connexion n'a été ajoutée dans la nav
- [ ] L'icône reprend la charte, le survol et la dimension de l'icône de panier
- [ ] Elle reste visible en Mode vitrine
- [ ] La Carte, ses prix et ses boutons d'ajout au panier sont identiques connecté et déconnecté
- [ ] Le tunnel de commande est identique connecté et déconnecté — aucun lien de connexion n'y est apparu
- [ ] Aucun écran ne réclame un compte pour commander
- [ ] **Contrôle qui ne se voit pas à l'écran** : la porte ouvre sur un espace entièrement en français, où le mot de passe peut être changé et récupéré (tickets 02, 04, 05 effectivement livrés)
