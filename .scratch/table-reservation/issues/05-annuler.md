# 05 — Annuler

**What to build:** Le client libère sa table depuis un lien à jeton, **à tout moment jusqu'à l'Heure de réservation**, sans compte et sans téléphoner. Il n'y a pas de délai butoir : une annulation à 19h25 pour 19h30 est inutile pour la salle, mais elle vaut infiniment mieux qu'une table vide que personne n'attendait, et un bouton qui se désactive à H-2 transforme un client qui voulait bien faire en client qui ne fait rien.

C'est le **seul changement d'état** qu'une Réservation connaîtra jamais (ADR 0008) : `confirmed` ou `cancelled`, rien d'autre. La capacité libérée redevient immédiatement réservable.

**Blocked by:** 04 — Réserver.

**Status:** ready-for-agent

- [ ] `POST /store/table-reservations/:id/cancel` avec le jeton dans le corps, réponse `200`
- [ ] Aucun délai butoir : l'annulation reste possible jusqu'à l'heure de la Réservation
- [ ] **Idempotente** : annuler une Réservation déjà annulée renvoie `200`, pas une erreur — le client a cliqué deux fois sur son lien
- [ ] `404` **identique** pour une Réservation inconnue et pour un jeton invalide, afin de ne rien révéler à qui essaie des identifiants
- [ ] La capacité est rendue : l'appel de disponibilité qui suit propose à nouveau l'heure libérée
- [ ] Une Réservation annulée ne compte plus dans le calcul d'occupation
- [ ] Test d'intégration HTTP : annulation avec jeton valide, jeton faux, double annulation, et **libération effective de la capacité** vérifiée par un appel de disponibilité
