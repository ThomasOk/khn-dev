# 07 — Le serveur refuse un Produit hors carte

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « La validation serveur : les hooks existants, étendus », § « Testing Decisions / Seams 2 et 3 », User Stories 22–27, 30
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md) — l'instant présent décide, jamais le Créneau ; [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) — le précédent des deux hooks de validation

**Status:** ready-for-agent

**Blocked by:** 02 (le modèle et `isOnCarteAt`). Indépendant du storefront — peut avancer en parallèle des tickets 04 à 06.

## What to build

Le garde-fou. Sans lui, le retrait de la Carte n'est qu'une apparence : une page ouverte à 13h50 et cliquée à 14h05, ou une page de paiement ouverte avant 14h00, suffisent à faire passer une commande que la cuisine ne peut pas honorer.

**Aucun nouveau hook enregistré.** Le contrôle rejoint les hooks de validation qui existent déjà, là où le contrôle de Sélection vit :

- **À l'ajout au panier** — refus immédiat et exploitable, le client est encore sur la page qui peut corriger. Le hook de mise à jour de ligne est concerné lui aussi : **augmenter la quantité** d'une ligne devenue hors carte est une vente, et doit être refusée comme un ajout.
- **À la complétion du panier** — le contrôle qui compte, puisque la page de paiement a pu être ouverte avant que l'heure ne tourne. Le contrôle rejoint la **boucle par ligne existante**, à côté de la validation de Sélection. **L'ordre du hook ne change pas** : Mode vitrine → Créneau → boucle par ligne. Un panier doublement invalide signalera donc le Créneau d'abord, ce qui est déjà le comportement entre Créneau et Sélection — corriger ça pour le seul Hors carte le rendrait incohérent.

**La règle appliquée est celle de `isOnCarteAt`**, sur l'**instant présent**. Pas sur le Créneau choisi. La conséquence est voulue et doit être testée dans les deux sens : un Menu Midi payé à 13h55 pour un retrait à 14h20 **passe** — il a été acheté pendant le service, la cuisine l'a en main.

Le hook reçoit une Variante ; la remontée vers le Produit puis vers ses horaires suit le chemin que la validation de Sélection emprunte déjà pour remonter d'une Variante à sa Formule.

**Le type d'erreur.** `INVALID_DATA` — une donnée du client devenue invalide, comme le Créneau périmé et la Sélection décurée. Pas `CONFLICT`, réservé au refus délibéré du restaurateur qu'est le Mode vitrine. Le message nomme le Produit et ses heures du jour, de quoi construire l'écran de reprise du ticket 08.

**Une Formule hors carte est refusée même si tous les plats qu'elle propose sont disponibles** : l'heure de la Formule prime sur celle de ses Composants. Et réciproquement, un Produit hors carte reste choisissable **dans** un Composant d'une Formule à la carte — ce ticket ne touche pas à ça, c'est une décision explicite de l'ADR 0013, pas un oubli.

## Acceptance criteria

- [ ] Ajouter au panier la Variante d'un Produit hors carte est refusé, et la ligne n'est pas créée
- [ ] La même requête pour un Produit à la carte passe
- [ ] Augmenter la quantité d'une ligne dont le Produit est devenu hors carte est refusé
- [ ] Compléter un panier contenant un Produit hors carte est refusé **avant capture** : le statut de la session de paiement reste `"pending"` — même assertion que les tests existants du Créneau périmé et de la Sélection décurée
- [ ] Un panier dont le Produit est encore à la carte au moment du paiement est **accepté**, même si le Créneau choisi tombe après la fin de la plage
- [ ] Une Formule hors carte est refusée même quand toutes les Variantes de sa Sélection sont, elles, disponibles
- [ ] Un Produit hors carte reste sélectionnable dans un Composant d'une Formule à la carte (aucune règle transitive ajoutée)
- [ ] Aucun nouveau hook n'est enregistré ; l'ordre du hook de complétion (Mode vitrine → Créneau → boucle par ligne) est inchangé
- [ ] Les erreurs sont de type `INVALID_DATA` et leur message nomme le Produit et ses heures
- [ ] La règle vient de `isOnCarteAt` (ticket 02), non réécrite dans les hooks
- [ ] Seam 2 (moitié « refus ») et Seam 3 — tests HTTP d'intégration ; le Seam 3 étend le fichier de complétion de panier existant plutôt que d'en dupliquer la fixture
- [ ] `pnpm test` passe
