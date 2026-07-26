# 05 — Changer son mot de passe depuis le profil

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Story 24 ; § « Storefront — le mot de passe »

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement. Touche la page Profil, comme le ticket 02 : si les deux avancent en parallèle, attendre le conflit de texte, ce n'est pas une dépendance.

## What to build

Un client connecté doit pouvoir changer son mot de passe sans avoir à prétendre l'avoir oublié.

Le composant de changement de mot de passe **existe déjà dans le storefront, mais c'est un moignon du starter** : il journalise « Password update is not implemented » et ne fait rien. Il a été retiré de la page Profil parce qu'il ne servait à rien. **Il est donc à implémenter, pas à décommenter** — un lecteur pressé le remet en place tel quel et livre un formulaire qui accepte une saisie et ne change rien, ce qui est pire que son absence.

Une fois réel, il retrouve sa place sur la page Profil, à côté du nom, de l'email, du téléphone et de l'Adresse de facturation.

Le changement passe par le natif, avec la session du client. Il ne partage rien avec le ticket 04 : là, un jeton reçu par email prouvait l'identité ; ici, c'est la session. Aucun email n'est envoyé.

Le formulaire doit dire clairement ce qui s'est passé — un changement de mot de passe silencieux laisse le client dans le doute exactement sur la chose dont il ne veut pas douter.

## Acceptance criteria

- [ ] Un client connecté peut changer son mot de passe depuis la page Profil
- [ ] Le nouveau mot de passe permet de se connecter ; l'ancien ne le permet plus
- [ ] Le résultat est annoncé explicitement, succès comme échec — jamais un formulaire qui se réinitialise sans rien dire
- [ ] Le composant fait réellement l'appel : plus aucune journalisation « not implemented » ne subsiste
- [ ] Aucun email n'est envoyé lors d'un changement de mot de passe
- [ ] Le formulaire est en français et suit la présentation des autres blocs de la page Profil
- [ ] Un visiteur non connecté n'atteint pas ce formulaire
