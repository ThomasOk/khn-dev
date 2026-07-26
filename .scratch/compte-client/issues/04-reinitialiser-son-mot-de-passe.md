# 04 — Réinitialiser un mot de passe oublié, de bout en bout

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Stories 22, 23, 25, 30, 35 ; §§ « Backend — les deux emails », « Storefront — le mot de passe », « Testing Decisions »
**ADR :** [0011](../../../docs/adr/0011-compte-offered-after-the-payment.md) — « What this decision forbids », dernier point

**Status:** ready-for-agent

**Blocked by:** 01 (sans échec bruyant sur un template inconnu, un email de réinitialisation vide part sans que rien ne le signale — et un email de réinitialisation sans jeton n'est rien).

## What to build

La serrure de secours. Aujourd'hui un mot de passe oublié est un compte perdu **définitivement** : rien dans le storefront ne demande de réinitialisation, et aucune page ne pose un nouveau mot de passe. C'est ce qui interdit d'ouvrir la porte, et donc ce qui bloque le ticket 10.

**Le mécanisme est natif et déjà migré.** Medusa expose la demande de réinitialisation et la pose d'un nouveau mot de passe à partir d'un jeton, et la table qui stocke ces jetons — hachage, expiration — existe déjà en base. **Rien à modéliser, aucune route API à créer.**

**Ce qui manque est la livraison et les écrans.** Medusa émet l'événement portant le jeton et s'arrête là : il ne connaît ni le fournisseur d'envoi, ni la langue, ni la charte. Il faut donc un souscripteur sur cet événement et un template dans le module `resend-notification` existant, à côté des six autres — pas un second chemin de notification.

**L'email ne vaut que par son lien.** Le jeton est la seule chose qui identifie la demande ; un email qui n'en transporte pas d'exploitable est un email inutile, et c'est le mode de panne que le test doit couvrir. Le lien pointe vers la page de définition du nouveau mot de passe, **qui est créée dans ce ticket** — aucun jeton ne doit mener à une page absente.

**Deux pages storefront**, en français dès l'écriture : demander une réinitialisation (une adresse email), et définir le nouveau mot de passe à partir du jeton. La seconde fonctionne **déconnecté et sur n'importe quel appareil** — le client fait sa demande sur son ordinateur et ouvre le lien sur son téléphone, et c'est le cas normal, pas le cas limite. Le jeton suffit, et c'est toute la raison d'être du lien.

**Aucune énumération.** La demande répond de façon identique que le compte existe ou non. Une réponse qui diffère laisserait n'importe qui sonder la clientèle du restaurant adresse par adresse.

**Le restaurant n'est destinataire de rien** : cet email ne concerne pas le service.

## Acceptance criteria

- [ ] Demander une réinitialisation depuis le storefront envoie un email portant un lien exploitable
- [ ] Le lien mène à une page qui existe et qui pose effectivement le nouveau mot de passe
- [ ] Le nouveau mot de passe permet de se connecter ; l'ancien ne le permet plus
- [ ] La page de définition fonctionne **en étant déconnecté**, sur un appareil différent de celui de la demande
- [ ] Un jeton faux ou expiré est refusé avec un message compréhensible, pas une erreur brute
- [ ] Une demande pour une adresse inconnue ne crée **aucune** notification, et la réponse est indistinguable de celle d'une adresse connue
- [ ] L'email part par le module `resend-notification` existant, avec un template déclaré à côté des six autres
- [ ] Le restaurant ne reçoit aucun email lié à cette demande
- [ ] Les deux pages sont en français
- [ ] Test d'intégration HTTP vérifiant que **le jeton transporté permet réellement d'aboutir** — pas seulement qu'un email est parti
- [ ] **Contrôle qui ne se voit pas à l'écran** : aucune route API nouvelle n'a été créée
