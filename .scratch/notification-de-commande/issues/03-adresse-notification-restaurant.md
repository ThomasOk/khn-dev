# 03 — Le restaurateur configure l'adresse de la Notification depuis l'admin

**Spec :** [docs/specs/notification-de-commande.md](../../../docs/specs/notification-de-commande.md) — User Story 9, § « L'adresse email du restaurant : configuration `pickup`, pas variable d'environnement »

**Status:** ready-for-agent

**Blocked by:** rien — peut démarrer immédiatement.

## What to build

Le destinataire de la Notification de commande est une propriété du **restaurant**, pas du provider technique : si la personne responsable du service change, l'adresse doit suivre sans déploiement. Une variable d'environnement est explicitement rejetée pour cette raison.

La Configuration du retrait porte déjà la configuration métier éditable à chaud — Délai de préparation, durée de créneau — et se règle depuis la page de réglages admin des Horaires de retrait. Elle gagne l'adresse de notification du restaurant, réglable au même endroit, dans la même section que le Délai de préparation.

Ce ticket ne fait qu'ouvrir le réglage : personne ne lit encore cette adresse pour envoyer quoi que ce soit — c'est le ticket 07 qui la consommera. Il est démontrable seul : on ouvre les réglages, on saisit une adresse, on recharge, elle a tenu.

## Acceptance criteria

- [ ] La Configuration du retrait porte une adresse de notification du restaurant, avec sa migration
- [ ] L'adresse se lit et s'édite depuis la page de réglages de retrait de l'admin, à côté du Délai de préparation
- [ ] Une adresse enregistrée survit à un rechargement de la page
- [ ] Une configuration existante sans adresse ne casse pas la page de réglages ni la lecture de la configuration (la feature Créneaux continue de fonctionner)
- [ ] Vérification à la main dans l'admin (dev server) — même précédent que le reste des réglages de retrait, pas de test dédié (spec, § « Volontairement non testé »)
