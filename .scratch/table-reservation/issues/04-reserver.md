# 04 — Réserver

**What to build:** Un client peut réserver une table. Le `POST` crée une Réservation **confirmée immédiatement et sans condition** (ADR 0008) : pas d'état d'attente, pas de validation humaine. Ce que la route confirme, le restaurant le doit.

La capacité étant une ressource finie, l'acceptation est le seul endroit du système avec un vrai problème de concurrence : deux clients peuvent viser les dernières places à la même seconde. La recherche de disponibilité **et** l'insertion tournent donc ensemble dans un job verrouillé sur la date. Le verrou et le chemin d'acceptation ne sont jamais séparés — livrer l'un sans l'autre, c'est livrer une fenêtre de surbooking.

Vérifié contre la 2.16 installée : le module Locking expose `execute(keys, job, { timeout })`, son provider par défaut est **`in-memory`** (protection intra-process seulement), et `@medusajs/locking-postgres` — déjà une dépendance de `@medusajs/medusa`, rien à installer — s'appuie sur `pg_advisory_xact_lock`. `execute` fait un `Promise.race` entre l'acquisition et un timeout de 5 s par défaut.

**Blocked by:** 02 — Les Services et la disponibilité.

**Status:** ready-for-agent

- [ ] Modèle Réservation et sa migration : date et heure locales en texte, couverts, durée d'occupation, référence du Service, statut (`confirmed` | `cancelled`), nom, email, téléphone, note optionnelle, jeton d'annulation unique, date d'annulation
- [ ] `POST /store/table-reservations` renvoie `201` avec `{ id, date, time, party_size, cancellation_token }`
- [ ] **Toutes** les valeurs du client sont revalidées serveur, y compris l'heure : la route est publique, une heure non revalidée n'est qu'un champ que le client contrôle
- [ ] La **Durée d'occupation est copiée** sur la Réservation à sa création et n'est plus jamais relue depuis le Service — changer la durée d'un Service ne modifie aucune Réservation existante
- [ ] Refus au-delà de la taille de groupe maximale, avec le téléphone dans la réponse
- [ ] Refus quand la capacité serait dépassée à un instant quelconque de l'intervalle
- [ ] `400` sur entrée invalide, `409` sur conflit de capacité ou heure plus offrable
- [ ] `locking-postgres` enregistré dans la configuration Medusa — **sans cette ligne le verrou est un no-op silencieux dès la deuxième instance**
- [ ] Recherche de disponibilité et insertion dans le même job verrouillé, clé dérivée de la date
- [ ] Un échec d'acquisition du verrou renvoie `409` avec un message invitant à réessayer, **jamais une 500**
- [ ] Test d'intégration HTTP — **le test qui porte l'ADR 0006** : remplir la capacité à 19h30, puis vérifier que 20h00 est refusé alors que personne n'a réservé à 20h00
- [ ] Test d'intégration HTTP : la Réservation persistée porte sa propre durée d'occupation ; modifier ensuite la durée du Service ne la change pas
- [ ] Test d'intégration HTTP de concurrence : N requêtes en parallèle sur les dernières places, le total accepté ne dépasse jamais la capacité, les perdants reçoivent `409`. **Écrire dans le test que ce cas passerait aussi avec le provider en mémoire** — il prouve la logique d'exclusion, pas la protection multi-instance, que seule la configuration garantit
