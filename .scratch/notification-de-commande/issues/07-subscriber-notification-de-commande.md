# 07 — Une commande payée envoie le ticket cuisine au restaurateur

**Spec :** [docs/specs/notification-de-commande.md](../../../docs/specs/notification-de-commande.md) — User Stories 1, 10, 11, 12, 16, 17 ; § « Un second subscriber, indépendant du premier », Testing Decisions Seam 3
**ADR :** [0004](../../../docs/adr/0004-creneau-in-order-metadata.md) — le Créneau vit dans `order.metadata`

**Status:** ready-for-agent

**Blocked by:** 01 (l'approche de test du seam d'intégration doit être tranchée avant d'écrire ce test), 03 (l'adresse du restaurant doit être configurable pour être lue), 05 (le ticket complet, Sélection comprise, doit se rendre), 06 (le provider doit savoir envoyer une pièce jointe et le template email doit exister).

## What to build

La boucle se ferme : à chaque commande payée, un second email arrive chez le restaurateur — distinct de la confirmation client — avec le ticket cuisine 80mm en pièce jointe, prêt à imprimer et à donner tel quel à la cuisine. Plus besoin de surveiller l'admin en continu pendant le service.

`order.placed` déclenche un **nouveau subscriber, à côté de celui de la confirmation client et jamais fusionné avec lui**. Deux documents, deux destinataires, deux raisons de changer — le même argument que CONTEXT.md donne déjà pour Facture vs Ticket cuisine. Opérationnellement, c'est ce qui garantit qu'un PDF qui refuse de se générer ne fait jamais échouer l'email de la personne qui a payé. Comme le subscriber existant, il **avale ses erreurs** : `catch` + `logger.error`, jamais de relance. Une commande déjà payée ne doit jamais échouer pour un ticket. Le client, lui, ne voit et ne vit rien de différent au paiement.

Le subscriber lit le Créneau sur la commande, résout l'adresse du restaurant depuis la configuration de retrait (ticket 03) — pas depuis une variable d'environnement — génère le PDF et l'envoie en pièce jointe.

Les **deux** subscribers gagnent une clé d'idempotence (`order-confirmation:${order.id}` et `kitchen-ticket:${order.id}`) : `order.placed` peut être rejoué, et le module Notification déduplique déjà nativement dessus. Un rejeu ne doit jamais envoyer deux fois le même ticket ni la même confirmation.

L'admin Medusa reste la source de vérité si l'email n'arrive pas — aucun état de commande ne dépend de cet envoi.

## Acceptance criteria

- [ ] Un `POST /store/carts/:id/complete` déclenche réellement `order.placed` et provoque **exactement deux** notifications pour la commande : une confirmation vers l'email du client, une notification de commande vers l'adresse du restaurant configurée
- [ ] L'assertion d'intégration porte sur les notifications persistées (résolues depuis le container), **sans dépendre de leur `status`** — la ligne est insérée et mise à jour que l'envoi au provider réussisse ou échoue
- [ ] Test d'intégration écrit selon la voie tranchée au ticket 01, en réutilisant la fixture de commerce de `complete-cart.spec.ts`
- [ ] Le PDF part en pièce jointe, distinct du template de l'email
- [ ] Une génération de PDF qui échoue est journalisée et **n'empêche pas** la confirmation client de partir, ni ne fait échouer la commande
- [ ] Les deux subscribers portent leur clé d'idempotence ; un rejeu de `order.placed` n'envoie pas de doublon
- [ ] Vérification de bout en bout : une commande passée en dev produit un email restaurateur dont la pièce jointe s'ouvre et s'imprime
