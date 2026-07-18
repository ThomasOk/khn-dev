# 06 — Les notifications

**What to build:** Le client reçoit son récapitulatif et son lien d'annulation ; le restaurant est prévenu à chaque Réservation **et à chaque annulation**.

Les deux emails n'ont pas le même statut. Celui du client est **contractuel** — c'est la preuve qu'il garde, et il porte le lien qui lui permet de libérer la table. Ceux du restaurant sont une commodité : la liste dans l'admin reste la source de vérité. Parmi les deux, **celui d'annulation est le plus utile** et se traite comme le cas principal : une Réservation qui arrive est une bonne nouvelle sans urgence, une annulation modifie une Feuille de service peut-être déjà imprimée.

Passe par le module `resend-notification` existant, pas par un nouveau provider. Prior art : la Notification de commande.

**Blocked by:** 05 — Annuler (l'email de confirmation porte le lien d'annulation ; sans lui on enverrait un lien mort).

**Status:** ready-for-agent

- [ ] Email au client à la création : date, heure, Couverts, nom du restaurant, et **lien d'annulation** portant le jeton
- [ ] Cet email indique explicitement que pour modifier on annule et on refait, **ou on appelle** — c'est le rattrapage du groupe qui grossit
- [ ] Email au restaurant à la création et à l'annulation, vers l'adresse de notification **propre au module** (jamais celle du retrait)
- [ ] Sujets préfixés et lisibles au tri sans ouvrir : `[Réservation] 12/08 20h00 — 4 pers. — Dupont` et `[Annulation] …`
- [ ] Aucune pièce jointe, aucun PDF — la Feuille de service se sort du jour, pas d'une Réservation
- [ ] Un échec d'envoi ne fait pas échouer la Réservation : la table est réservée même si l'email tombe
- [ ] Test d'intégration HTTP : créer une Réservation déclenche **deux** notifications (client et restaurant) ; l'annuler en déclenche une (restaurant)
