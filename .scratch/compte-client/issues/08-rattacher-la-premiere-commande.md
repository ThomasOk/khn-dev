# 08 — Rattacher la première commande au compte qu'on vient de créer

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Stories 14, 15, 17, 18, 19 ; § « Storefront — la création après le paiement »
**ADR :** [0011](../../../docs/adr/0011-compte-offered-after-the-payment.md) — « Why the first Commande is claimed through an email »

**Status:** ready-for-agent

**Blocked by:** 06 (sans l'email et son jeton, la demande déclenchée ici ne mène nulle part) et 07 (il faut un compte créé après paiement pour avoir quelque chose à rattacher).

## What to build

La dernière pièce : l'historique du client ne commence pas vide.

Le ticket 07 crée un compte peuplé, mais la commande qui l'a fait naître a été passée en invité et n'appartient à personne. Medusa ne la rattache pas d'elle-même à un compte inscrit ensuite avec la même adresse. Ce ticket déclenche la demande de rattachement **automatiquement**, à la création du compte : le storefront connaît déjà l'identifiant de la commande, le client n'a aucun identifiant à recopier nulle part.

Le formulaire natif de réclamation, qui demande de saisir un identifiant de commande à la main, reste en place comme recours. Il n'est pas le chemin principal : personne ne va chercher un identifiant dans un email pour le recopier.

**Le client reçoit un email et clique une fois.** C'est le geste qu'ADR 0011 a explicitement choisi de conserver plutôt que de rattacher en silence, et pour une raison à ne pas défaire ici : une commande se lit sans authentification, l'inscription ne vérifie aucune adresse email, et cet email est donc la seule preuve de possession de la boîte mail dans tout le système.

**Ce geste n'arrive qu'une fois dans la vie du client.** Dès la commande suivante, il est connecté : son panier porte son identité dès le premier plat ajouté et la commande lui appartient nativement, sans rattachement ni email. Le vérifier fait partie de ce ticket — c'est ce qui prouve que la gêne est bornée et non récurrente.

**L'échec du rattachement ne coûte rien d'autre.** Le compte et l'adresse du ticket 07 restent acquis ; seul l'historique manque. Le client est informé que sa commande sera rattachée depuis l'email, jamais par une erreur bloquante.

## Acceptance criteria

- [ ] Créer un compte après paiement déclenche la demande de rattachement de cette commande, sans que le client saisisse d'identifiant
- [ ] Le client reçoit l'email de rattachement et le lien rattache effectivement la commande
- [ ] La commande rattachée apparaît ensuite dans son historique
- [ ] Un échec de la demande laisse le compte et l'Adresse de facturation intacts, et n'est pas présenté comme une erreur bloquante
- [ ] Le client comprend, sans jargon, que son historique se complétera depuis l'email
- [ ] **Une commande passée ensuite en étant connecté apparaît dans l'historique sans aucun email ni geste** — la vérification qui prouve que le rattachement ne concerne que la première
- [ ] Le formulaire natif de réclamation par identifiant reste accessible comme recours
- [ ] Les textes ajoutés sont en français
