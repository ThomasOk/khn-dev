# 06 — Le provider Resend sait envoyer une pièce jointe, et l'email restaurateur existe

**Spec :** [docs/specs/notification-de-commande.md](../../../docs/specs/notification-de-commande.md) — User Stories 8 et 18, § « Le mapping Resend », Testing Decisions Seam 2

**Status:** ready-for-agent

**Blocked by:** rien — peut démarrer immédiatement.

## What to build

Le provider `resend-notification` ne connaît pas les pièces jointes aujourd'hui : son type local partiel ne les déclare pas, et son `send()` les jetterait en silence. Deux choses manquent avant qu'un ticket puisse partir.

**Le provider accepte les pièces jointes.** `send()` est retypé sur le vrai contrat du framework (`NotificationTypes.ProviderSendNotificationDTO`), pas sur le type local partiel qui ignore ce champ. Une fonction pure et exportée traduit chaque `Attachment` Medusa vers la forme attendue par le SDK Resend — **explicitement, champ par champ, jamais par spread**. Le spread est le piège précis à éviter : les deux SDKs nomment les mêmes choses différemment (`content_type` vs `contentType`, `id` vs `contentId`), et un spread produirait une pièce jointe sans type de contenu, que Resend devinerait depuis le nom de fichier. Le mapping est une fonction testée pour qu'un renommage de champ dans l'un des deux SDKs casse un test plutôt qu'un email en production.

**L'email du restaurateur existe.** Un second template react-email, à côté de celui de la confirmation client, enregistré sous son propre nom dans le `switch` de rendu. Son corps donne, **sans ouvrir la pièce jointe**, le nom du client, le numéro de commande et le Créneau de retrait — de quoi juger en un coup d'œil s'il faut se presser. Le PDF **n'est pas** ce template : il est construit séparément et passé via le champ `attachments`, indépendant de `template`.

Le rendu HTML de ce template n'est pas testé — même précédent que la confirmation client aujourd'hui (spec, § « Volontairement non testé »).

## Acceptance criteria

- [ ] `send()` est typé sur `NotificationTypes.ProviderSendNotificationDTO` et transmet les pièces jointes à Resend
- [ ] Une fonction pure exportée traduit les `Attachment` Medusa vers la forme Resend, champ par champ, sans spread
- [ ] Test unitaire : un `Attachment` avec `content_type`/`id` produit un objet portant `contentType`/`contentId`, **jamais** les clés snake_case d'origine
- [ ] Test unitaire : un `content_type` absent retombe sur une valeur par défaut **explicite**, pas sur l'inférence de Resend depuis le nom de fichier
- [ ] Un second template react-email est enregistré dans le `switch` de rendu, avec son propre sujet
- [ ] Le corps de cet email donne le nom du client, le numéro de commande et le Créneau — vérification à la main
- [ ] La confirmation client continue de partir exactement comme avant
