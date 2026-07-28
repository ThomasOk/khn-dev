# 08 — Le client comprend le refus et reprend son panier

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « La validation serveur » (récupération), User Stories 22, 23, 26
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md)

**Status:** ready-for-agent

**Blocked by:** 07 (les refus serveur et leurs messages doivent exister).

## What to build

Un refus que le client ne comprend pas est un panier abandonné. Ce ticket transforme les deux refus du ticket 07 en quelque chose sur quoi le client peut agir.

**À l'ajout au panier.** Le client a ouvert la Carte à 13h50 et clique à 14h05 : ce n'est pas une tentative de fraude, c'est une page périmée. Il doit lire tout de suite ce qui se passe — « Le Menu Midi n'est servi que de 11h30 à 14h00 » — et non une erreur générique. Le nom du Produit et ses heures viennent du message du serveur, pas d'une chaîne recopiée dans le storefront.

**Au paiement.** Le client arrive au moment où il allait payer. Il doit pouvoir **retirer la ligne en cause et poursuivre**, jamais recomposer tout son panier. Le message identifie quel Produit est en cause et à quelles heures il est servi. Précédent à suivre : la reprise déjà construite pour le Créneau expiré au paiement (`feat/reprise-creneau-expire`) — même principe de récupération gracieuse, et si possible mêmes composants plutôt qu'un second mécanisme parallèle.

**Attention à l'ordre.** Un panier doublement invalide au paiement — Créneau périmé **et** Produit hors carte — signale le Créneau d'abord (ticket 07, ordre du hook inchangé). Le storefront ne doit pas essayer de deviner ou de fusionner les deux : il affiche ce que le serveur lui renvoie, et le client fera un second aller-retour dans ce cas rare. Ne pas construire d'écran qui présumerait des deux causes à la fois.

**Ce qui n'est pas dans ce ticket.** Aucun avertissement dans le panier lui-même quand un Produit qu'il contient passe hors carte : ce serait une lecture non cachée à chaque affichage du panier, pour le seul client à cheval sur 14h00. Le client le découvre au paiement, ici.

## Acceptance criteria

- [ ] Un clic sur « ajouter » depuis une page périmée affiche un message qui nomme le Produit et ses heures, pas une erreur générique
- [ ] Ce message est celui du serveur — aucune liste d'heures ni de noms de Produits recopiée côté storefront
- [ ] Au paiement, le refus affiche un écran qui identifie le Produit en cause et permet de retirer la ligne puis de poursuivre
- [ ] Le panier n'est jamais vidé ni recomposé : les autres lignes survivent au retrait
- [ ] Après retrait de la ligne, le paiement peut aboutir sans nouvelle intervention
- [ ] La reprise réutilise, autant que possible, les composants de la reprise du Créneau expiré plutôt que d'en créer un second mécanisme
- [ ] Un panier doublement invalide affiche le message du Créneau d'abord, sans écran spécial ni tentative de fusion des deux causes
- [ ] Aucun avertissement ajouté dans la page panier, et aucune lecture non cachée introduite
- [ ] Vérification à la main, dev server : composer un panier avec une plage courante, la déplacer dans le passé depuis l'admin, puis tenter d'ajouter puis de payer
