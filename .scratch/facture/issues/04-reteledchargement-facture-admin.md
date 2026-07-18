# 04 — Retéléchargement de la Facture depuis l'admin

**Spec :** [docs/specs/facture.md](../../../docs/specs/facture.md) — Solution § « Pour le restaurateur » ; User Stories 15, 16
**ADR :** [0002](../../../docs/adr/0002-factures-issued-frozen.md) — le document est figé, jamais régénéré

**What to build:** Depuis la fiche Commande de l'admin Medusa, le restaurateur retrouve la Facture émise et la retélécharge — exactement les octets d'origine, jamais une régénération — pour la renvoyer au client sur demande.

Contours :
- Widget admin sur la fiche Commande (`order.details`), affiché quand une `Invoice` existe pour la commande : montre le numéro de facture et un bouton de téléchargement.
- Le téléchargement sert le PDF **stocké** (via `file_id` dans le File Module), pas un rendu recalculé. Aucune route ni bouton ne régénère le document.

**Blocked by:** 03 (une Facture émise, avec fichier stocké et lien vers la commande, doit exister pour être retéléchargée).

**Status:** ready-for-agent

- [x] Sur la fiche d'une Commande facturée, le widget affiche le Numéro de facture et un lien de téléchargement
- [x] Le téléchargement fournit les octets du PDF stockés à l'émission (mêmes octets, aucune régénération)
- [x] Sur une Commande sans Facture, le widget n'affiche pas de lien de téléchargement
