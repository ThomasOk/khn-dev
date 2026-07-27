# 03 — L'Adresse de facturation suit la Commande

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Stories 10, 11, 12, 13, 27, 31, 32, 33, 34 ; §§ « Backend — l'adresse suit la Commande », « Testing Decisions »
**ADR :** [0011](../../../docs/adr/0011-compte-offered-after-the-payment.md) — « Why the Adresse de facturation is written silently »

**Status:** done

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

- [x] Finaliser un panier en étant authentifié pose l'adresse de la Commande en adresse de facturation par défaut du Client
- [x] Une seconde commande avec une autre adresse **remplace** la première : le Client n'a jamais deux adresses de facturation par défaut
- [x] Une commande passée en invité n'écrit sur aucun Client
- [x] Une adresse renseignée à la main sur le profil est remplacée par celle de la commande suivante — comportement délibéré, couvert par un test
- [x] Le nom et le téléphone portés par la Commande arrivent aussi sur le Client
- [x] La logique est dans un Workflow appelé par le souscripteur, pas dans le souscripteur
- [x] Le checkout d'un client connecté qui a déjà commandé arrive pré-rempli, sans qu'aucun code de lecture n'ait été ajouté
- [x] Test d'intégration HTTP sur `medusaIntegrationTestRunner`, en attendant l'effet asynchrone comme le font déjà les specs de facture et de ticket cuisine
- [x] **Contrôle qui ne se voit pas à l'écran** : le Ticket cuisine, la Notification de commande et la Facture sont strictement inchangés

## Notes de mise en œuvre

- **Découverte non documentée dans la spec :** `createCartWorkflow` de Medusa attache *toujours* un `customer_id` à la commande, même en invité — `findOrCreateCustomerStep` crée silencieusement un Client fantôme (`has_account: false`) à partir de l'email du panier dès qu'aucun acteur authentifié n'est présent. Un simple test « la Commande a un `customer_id` » aurait donc écrit l'adresse sur ce fantôme à chaque commande invité, exactement ce que ce ticket interdit. Le workflow teste `customer.has_account`, pas la seule présence de `customer_id` — c'est ce champ, pas `customer_id`, qui distingue un Client du glossaire d'un fantôme technique.
- Le souscripteur (`customer-billing-address-sync.ts`) est le quatrième sur `order.placed`, aux côtés de `order-confirmation`, `kitchen-ticket-notification` et `auto-capture-payment` — mêmes disciplines try/catch + `logger.error`, jamais de throw.
- Le Workflow (`workflows/customer/sync-billing-address-from-order.ts`) lit puis met à jour ou crée en une seule étape (`upsertCustomerBillingAddressStep`) — jamais les workflows natifs `createCustomerAddressesWorkflow` / `updateCustomerAddressesWorkflow`, qui ne font que désactiver l'ancien indicateur `is_default_billing` sans supprimer la ligne, ce qui aurait fait grossir la table à chaque commande.
- Test d'intégration : `integration-tests/http/customer-billing-address-sync.spec.ts`, avec son aide d'attente dédiée `wait-for-billing-address-sync.ts` (aucune notification à observer ici, contrairement à la Facture ou au Ticket cuisine — on interroge directement l'adresse par défaut du Client).
