# 02 — Les Services et la disponibilité

**What to build:** Le restaurateur déclare depuis l'admin ses Services de la semaine — « Déjeuner, mardi, 12h00–14h00, 30 couverts, 1h00 » — et ses réglages (horizon, délai minimum, pas, taille de groupe maximale, téléphone des grands groupes). Le site peut alors demander les Heures de réservation disponibles pour une date et un nombre de Couverts, et reçoit les heures réelles.

Le calcul de disponibilité est une **fonction pure à horloge injectée**, sur le modèle de `deriveSlots`. Elle inclut **la capacité dès ce ticket** : elle reçoit les Réservations existantes en paramètre (de simples données : heure, couverts, durée), ce qui permet de tester tout le calcul difficile — chevauchement d'intervalles, durées mixtes, borne semi-ouverte, changements d'heure, service qui déborde après minuit — avant qu'aucune Réservation ne soit persistable. Aucun accès base, aucune horloge implicite.

**Blocked by:** 01 — Extraire les primitives d'heure locale.

**Status:** ready-for-agent

- [ ] Module `table-reservation` créé et enregistré, avec les modèles Service et Configuration et leurs migrations
- [ ] Configuration : horizon (30 j), délai minimum (30 min), pas (30 min), taille de groupe maximale (8), marge de dernier départ, téléphone des grands groupes, email de notification propre au module
- [ ] Admin : CRUD des Services et formulaire de configuration
- [ ] `GET /store/table-reservations/availability?date=&party_size=` renvoie `{ date, party_size, times, open, max_party_size, large_party_phone }`
- [ ] Les heures s'arrêtent à la fin du Service moins la marge de dernier départ ; la dernière heure offerte est incluse
- [ ] Une `party_size` au-dessus du plafond renvoie `200` avec `times: []` et le téléphone — jamais une erreur
- [ ] `open: false` quand le jour n'a aucun Service ou est hors horizon, pour que le storefront puisse dire *pourquoi* la liste est vide
- [ ] L'occupation se calcule en minutes depuis minuit du jour du Service et **autorise des valeurs au-delà de 1440** : un dîner à 22h30 + 2 h appartient au service de la veille
- [ ] L'intervalle est **semi-ouvert** : une Réservation qui finit à 20h00 laisse 20h00 disponible
- [ ] Des Réservations de durées **différentes** qui se chevauchent sont additionnées sur leurs intervalles réels, jamais avec une durée courante appliquée à toutes
- [ ] Tests unitaires : les deux changements d'heure, borne exacte du délai minimum, borne exacte de l'horizon (jour 30 / jour 31), capacité atteinte pile (le dernier groupe qui tient, puis celui qui ne tient plus d'un Couvert), deux Services le même jour avec capacités et durées différentes, durées mixtes qui se chevauchent, borne du chevauchement, service qui déborde après minuit, jour sans aucun Service
- [ ] Test d'intégration HTTP sur la route
