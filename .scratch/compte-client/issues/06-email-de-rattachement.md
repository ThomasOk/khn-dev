# 06 — L'email de rattachement de commande

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Stories 16, 17, 29, 30, 35 ; §§ « Backend — les deux emails », « Testing Decisions »
**ADR :** [0011](../../../docs/adr/0011-compte-offered-after-the-payment.md) — « Why the first Commande is claimed through an email »

**Status:** ready-for-agent

**Blocked by:** 01 (un email de rattachement sans jeton exploitable ne sert à rien, et le cas par défaut actuel en enverrait un sans que rien ne le signale).

## What to build

Le chaînon manquant d'un mécanisme entièrement natif mais **actuellement inerte**.

Tout le circuit existe déjà : le storefront sait demander un transfert, l'accepter et le refuser, les pages d'acceptation existent, et le backend émet bien l'événement portant le jeton au moment de la demande. **Mais rien ne l'écoute**, et le module d'envoi n'a pas de template pour lui. Aujourd'hui le client demande un rattachement, l'écran lui annonce qu'un email est parti, et rien n'arrive — ou pire, un email vide arrive. Le transfert ne peut jamais aboutir.

Ce ticket écrit le souscripteur et le template. C'est **le même geste que le ticket 04**, dans le même module, sur les mêmes rails — les deux tickets se ressemblent volontairement.

**L'email part à l'adresse portée par la Commande**, jamais à celle du demandeur. C'est précisément ce qui en fait une preuve de possession de la boîte mail, et c'est la seule preuve de ce genre dans tout le système : l'inscription ne vérifie aucune adresse. Envoyer ailleurs viderait la décision d'ADR 0011 de son contenu tout en gardant sa gêne.

**Le lien mène à la page d'acceptation, qui existe déjà.** Rien à créer côté storefront dans ce ticket. Le jeton est la seule chose qui identifie la demande.

**Accepter exige d'être connecté** : le client qui ouvre le lien sur un autre appareil devra s'y connecter. C'est le comportement natif, il est conservé, et le message de la page doit le rendre compréhensible plutôt que de laisser croire à une erreur.

**Le restaurant n'est destinataire de rien** : ce mail ne concerne pas le service.

Le test qui compte ne vérifie pas qu'un email part — il vérifie que **le jeton transporté rattache effectivement la commande**. Sans lui, on aurait exactement la situation d'aujourd'hui, en croyant l'avoir corrigée.

## Acceptance criteria

- [ ] Demander le rattachement d'une commande produit une notification portant le bon template
- [ ] Cette notification est adressée à l'email **de la commande**, jamais à celui du demandeur
- [ ] Elle transporte l'identifiant de commande et le jeton
- [ ] **Le jeton transporté permet réellement d'aboutir** : accepter avec lui rattache la commande au Client
- [ ] Un jeton faux est refusé
- [ ] La page d'acceptation existante fonctionne avec le lien reçu, sans modification
- [ ] Un client non connecté qui ouvre le lien comprend qu'il doit se connecter, sans voir une erreur brute
- [ ] Le restaurant ne reçoit aucun email lié à un rattachement
- [ ] L'email part par le module `resend-notification` existant, template déclaré à côté des autres
- [ ] Le contenu de l'email est en français
- [ ] Test d'intégration HTTP sur `medusaIntegrationTestRunner`, en attendant que la notification sorte de l'état d'attente comme le font déjà les specs de réservation et de ticket cuisine
