# 01 — Trancher l'accès réseau vers Resend pendant les tests

**Spec :** [docs/specs/notification-de-commande.md](../../../docs/specs/notification-de-commande.md) — § « Testing Decisions », Seam 3 (« Point à trancher avant d'implémenter ce seam ») et § « Further Notes »

**Status:** ready-for-agent

**Blocked by:** rien — peut démarrer immédiatement.

## What to build

Le spec choisit de faire déclencher `order.placed` par un vrai `POST /store/carts/:id/complete` sur une base disposable, et d'assurer que le module Notification a bien persisté ses lignes — sans dépendre du `status` d'envoi. Ça suppose que l'environnement de test tolère un appel réseau sortant vers l'API Resend qui échoue faute de clé valide. Ni le spec ni la recherche n'ont vérifié ce point pour la CI de ce repo, et il décide s'il faut ou non enregistrer un provider factice sous `NODE_ENV=test` — une décision d'infrastructure qui coûte cher à prendre après coup, une fois les autres tests écrits par-dessus.

Ce ticket répond à une seule question par l'expérience : **quand un test d'intégration HTTP déclenche `order.placed` sans clé Resend valide, que se passe-t-il ?** Le test tient-il (l'erreur du provider est avalée après persistance, comme le laisse entendre la lecture du module), ou pend-il / échoue-t-il sur un réseau sortant bloqué ?

La réponse est consignée dans le spec — en amendant § « Testing Decisions » pour retirer le point en suspens et acter la voie retenue : soit le seam tel qu'écrit, soit le provider factice sous `NODE_ENV=test` dans `medusa-config.ts` (aujourd'hui explicitement rejeté par défaut, à reconsidérer seulement ici).

## Acceptance criteria

- [ ] Un test d'intégration HTTP jetable déclenche réellement `order.placed` sans clé Resend valide, et son comportement observé est décrit noir sur blanc (le test passe / échoue / pend, en combien de temps)
- [ ] Le § « Testing Decisions » du spec ne porte plus de point en suspens : il acte soit le seam tel qu'écrit, soit le provider factice sous `NODE_ENV=test`
- [ ] Si le provider factice est retenu, ce qu'il doit faire (et ne pas faire) est écrit assez précisément pour que le ticket 07 l'implémente sans rejouer la décision
- [ ] Aucun code de production n'est modifié par ce ticket
