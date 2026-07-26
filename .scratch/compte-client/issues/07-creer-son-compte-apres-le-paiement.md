# 07 — Créer son compte après le paiement

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Stories 4, 5, 6, 7, 8, 32 ; § « Storefront — la création après le paiement »
**ADR :** [0011](../../../docs/adr/0011-compte-offered-after-the-payment.md) — « Why nothing is offered inside the checkout »

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement. Le rattachement de la commande à l'historique est le ticket 08 ; il est délibérément séparé.

## What to build

Le seul endroit de tout le parcours où le Compte se propose.

Un bloc sur la page de confirmation de commande, après le récapitulatif, qui offre de créer un compte. **Un seul champ : le mot de passe.** L'email, le nom, le téléphone et l'Adresse de facturation viennent de la Commande que le client vient de payer — il ne ressaisit rien de ce qu'il vient de saisir. C'est toute la raison pour laquelle le Compte est proposé ici et nulle part avant : à cet instant, le bénéfice se nomme tout seul, parce que le client vient de le payer en effort.

Le bloc **disparaît** pour un visiteur déjà connecté.

**Ce que ce ticket livre : un compte peuplé.** À la fin, le client a un compte, et son Adresse de facturation, son nom et son téléphone y sont — donc son prochain checkout arrive pré-rempli. C'est vérifiable seul, sans rien attendre d'un autre ticket : on commande en invité, on crée son compte, on se déconnecte, on recommande, l'adresse est déjà là.

**Ce que ce ticket ne livre pas : l'historique.** La commande qui vient d'être payée a été passée en invité et n'appartient encore à personne ; la rattacher est le ticket 08. La séparation est **délibérée et vient de la spec** (User Story 32) : les deux fonctions du Compte doivent tomber en panne indépendamment. Un client dont le rattachement échoue garde son adresse pré-remplie et ne perd que son historique.

**L'écriture de l'adresse se fait ici**, à partir de la commande affichée. Elle ne passe pas par le mécanisme du ticket 03 : celui-ci réagit à une commande passée par un client connecté, ce qui n'est pas le cas ici — la commande est antérieure au compte.

**Aucun échec ne doit coûter la page.** La confirmation est la seule page qui porte le numéro de commande et le Créneau de retrait : elle ne doit jamais être remplacée par une redirection ni perdue au profit d'un écran d'erreur. Si une étape échoue, le client le sait, et ce qui a réussi reste acquis.

## Acceptance criteria

- [ ] La page de confirmation propose de créer un compte, avec le mot de passe pour seul champ à remplir
- [ ] Le bloc n'apparaît pas pour un visiteur déjà connecté
- [ ] Le compte créé porte l'email, le nom et le téléphone de la Commande
- [ ] Il porte l'Adresse de facturation de la Commande, en adresse par défaut
- [ ] Le client est connecté à l'issue de la création, sans avoir à saisir à nouveau ses identifiants
- [ ] Une commande passée plus tard avec ce compte arrive **pré-remplie** au checkout — la vérification de bout en bout de ce ticket
- [ ] Un échec à n'importe quelle étape laisse la page de confirmation entière et lisible, numéro de commande et Créneau compris
- [ ] Un échec est annoncé au client sans le priver de ce qui a réussi
- [ ] Refuser la proposition ne retire rien à la page
- [ ] Le bloc est en français et nomme le bénéfice : ne pas ressaisir son adresse la prochaine fois
- [ ] **Contrôle qui ne se voit pas à l'écran** : aucune étape de compte n'est apparue dans le tunnel — le checkout est strictement inchangé
