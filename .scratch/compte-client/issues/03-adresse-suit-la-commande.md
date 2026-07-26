# 03 — L'Adresse de facturation suit la Commande

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Stories 10, 11, 12, 13, 27, 31, 32, 33, 34 ; §§ « Backend — l'adresse suit la Commande », « Testing Decisions »
**ADR :** [0011](../../../docs/adr/0011-compte-offered-after-the-payment.md) — « Why the Adresse de facturation is written silently »

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement.

## What to build

Ce qui rend le Compte utile, et sans quoi tout le reste est décoratif : le client connecté ne retape jamais son adresse.

**La règle tient en une phrase.** Quand une Commande est passée et qu'elle a un Client, l'Adresse de facturation de ce Client devient celle de la Commande — mise à jour si elle existe déjà, créée sinon. Une Commande passée en invité n'écrit sur personne.

**Jamais une seconde adresse.** Le Client en a exactement une, c'est un invariant du glossaire, et c'est lui qui interdit le carnet d'adresses et son sélecteur — retirés du starter délibérément. Une implémentation qui empile les adresses ramènerait mécaniquement la question de savoir laquelle choisir, dans un tunnel dont ADR 0011 a décidé qu'on ne l'interromprait pas.

**« La dernière servie » est le comportement voulu**, pas un effet de bord. Le client qui déménage tape sa nouvelle adresse au paiement et n'a rien d'autre à faire ; celle qu'il avait renseignée à la main sur son profil est remplacée. C'est délibéré et un test doit le documenter, faute de quoi le prochain lecteur le corrigera comme un bug.

La logique vit dans un **Workflow**, appelé par un souscripteur sur la commande passée — jamais des appels de service enchaînés dans le souscripteur (`AGENTS.md`). Le souscripteur est nouveau et distinct de ceux qui existent déjà sur cet événement : une responsabilité, un fichier.

**Le rattachement de commande ne déclenche pas cette écriture**, et ce n'est pas un oubli : le workflow natif d'acceptation d'un transfert n'émet aucun événement, rien ne peut donc y réagir. C'est le ticket 07 qui écrit l'adresse pour le compte créé après paiement, depuis la commande qu'il a sous la main.

Le lecteur, lui, existe déjà : le checkout pré-remplit depuis l'adresse de facturation par défaut du Client. Rien à construire de ce côté — ce ticket lui donne enfin quelque chose à lire.

## Acceptance criteria

- [ ] Finaliser un panier en étant authentifié pose l'adresse de la Commande en adresse de facturation par défaut du Client
- [ ] Une seconde commande avec une autre adresse **remplace** la première : le Client n'a jamais deux adresses de facturation par défaut
- [ ] Une commande passée en invité n'écrit sur aucun Client
- [ ] Une adresse renseignée à la main sur le profil est remplacée par celle de la commande suivante — comportement délibéré, couvert par un test
- [ ] Le nom et le téléphone portés par la Commande arrivent aussi sur le Client
- [ ] La logique est dans un Workflow appelé par le souscripteur, pas dans le souscripteur
- [ ] Le checkout d'un client connecté qui a déjà commandé arrive pré-rempli, sans qu'aucun code de lecture n'ait été ajouté
- [ ] Test d'intégration HTTP sur `medusaIntegrationTestRunner`, en attendant l'effet asynchrone comme le font déjà les specs de facture et de ticket cuisine
- [ ] **Contrôle qui ne se voit pas à l'écran** : le Ticket cuisine, la Notification de commande et la Facture sont strictement inchangés
