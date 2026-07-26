# 01 — Un template de notification inconnu échoue au lieu d'envoyer un email vide

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — § « Further Notes », premier paragraphe

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement.

## What to build

Un filet de sécurité posé avant d'ajouter deux templates dont toute la valeur est un lien.

Le service de `resend-notification` aiguille aujourd'hui sur le nom du template, et son cas par défaut renvoie un email au sujet « Notification » et au corps « Vous avez une nouvelle notification. » — sans lien, sans jeton, sans rien. Un nom de template mal orthographié n'échoue donc pas : il **envoie un email vide**, et la ligne de notification passe au statut d'envoi réussi. Personne n'apprend jamais que quelque chose est cassé.

Les six templates existants portent tous un contenu qui se suffit à lui-même ; le piège est resté théorique. Les tickets 04 et 06 ajoutent deux emails qui ne valent **que** par le jeton qu'ils transportent : un email vide y est indistinguable d'un email correct pour tout le monde sauf le client, qui ne peut simplement plus rien faire.

Un template inconnu doit désormais faire échouer la notification bruyamment, de façon visible sur la ligne persistée. Les six templates existants continuent de partir exactement comme avant — c'est ce que ce ticket doit prouver, pas seulement affirmer.

Ce ticket est un **prefactor** : il ne livre aucune fonctionnalité au client et n'apparaît dans aucune User Story. Il est là parce qu'il rend diagnosticables les deux tickets qui suivent.

## Acceptance criteria

- [ ] Une notification demandée avec un nom de template inconnu échoue de façon observable, plutôt que de partir avec un contenu générique
- [ ] L'échec est visible sur la ligne de notification persistée — il ne se perd pas dans les journaux
- [ ] Les six templates existants partent inchangés : commande, ticket cuisine, facture, et les trois de réservation de table
- [ ] Aucun sujet ni corps d'email existant n'est modifié
- [ ] La suite de tests existante passe sans modification — en particulier les specs de notification de réservation et de ticket cuisine
