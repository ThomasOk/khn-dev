# 03 — Les Fermetures de réservation

**What to build:** Le restaurateur ferme la salle sur une période — les vacances d'août, une soirée privatisée, un jour férié — et ces jours disparaissent de la disponibilité, **sans que le click & collect en soit affecté**. C'est la conséquence directe de l'ADR 0007 : les deux canaux ont des calendriers séparés, possédés chacun par son module.

Comme cette séparation s'achète au prix d'une double saisie, ce ticket livre aussi sa mitigation : une page admin qui affiche **les deux calendriers côte à côte** — celui du retrait et celui de la salle — et signale visiblement une période présente dans l'un et absente de l'autre. C'est le seul garde-fou contre la panne silencieuse nommée dans l'ADR : la fermeture d'août saisie une seule fois sur deux, et découverte par un client devant une porte close.

**Blocked by:** 02 — Les Services et la disponibilité.

**Status:** ready-for-agent

- [ ] Modèle Fermeture de réservation (jours civils inclusifs en texte, motif optionnel) et sa migration, dans le module `table-reservation`
- [ ] **Aucun partage** avec la Fermeture exceptionnelle du retrait : ni table, ni ligne, ni code
- [ ] Admin : CRUD des Fermetures de réservation
- [ ] Une Fermeture vide entièrement la disponibilité de chaque jour qu'elle couvre, bornes incluses
- [ ] Une fermeture d'un seul jour (début = fin) fonctionne — c'est le cas du jour férié
- [ ] La page admin des fermetures affiche les deux calendriers côte à côte et signale les périodes présentes d'un seul côté
- [ ] Test unitaire : un jour couvert par une Fermeture, et les deux bornes de la période
- [ ] Test d'intégration HTTP : une Fermeture rend `open: false` et `times: []` sur la disponibilité, **et laisse `GET /store/pickup-slots` inchangé pour ce même jour**
