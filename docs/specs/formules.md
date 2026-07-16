# Formules

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — ce spec ne les rejoue pas :
[ADR 0001](../adr/0001-formules-as-flat-priced-produits.md) (une Formule est un Produit à Variante unique au prix fixe ; une Sélection ne porte aucun argent ; les Composants sont curés, jamais dérivés),
[ADR 0005](../adr/0005-formule-curation-via-module-selection-via-metadata.md) (la Curation vit dans un module `formule` + Module Link vers `ProductVariant` ; la Sélection vit en clés plates sur `line_item.metadata`, validée aux hooks `validate` de `addToCartWorkflow` et `completeCartWorkflow`),
[la recherche Medusa](../research/2026-07-16-medusa-formules-composants-selection.md) (toutes les citations de source),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md) (Formule, Composant, Sélection, Curation).

## Problem Statement

Aujourd'hui, chaque plat de la Carte se commande seul. Kim-Hi Noodle veut vendre des Formules — « Menu Midi : une entrée + un plat, 13,90 € » — où le client choisit ce qu'il mange mais paie un prix fixe qui ne dépend jamais de ses choix. Rien de tout ça n'existe : ni pour le restaurateur, qui n'a aucun moyen de dire quelles Variantes entrent dans quel slot d'une Formule, ni pour le client, qui n'a aucun sélecteur pour remplir ces slots au moment de commander.

Et sans garde-fou serveur, une Formule n'est qu'une apparence. Le client compose sa commande via des champs qu'il contrôle (`line_item.metadata`, ADR 0005) ; sans revérification, rien n'empêche techniquement de faire passer n'importe quelle Variante de la Carte comme choix dans un composant à 13,90 €, y compris le plat le plus cher de la carte. C'est exactement le risque que l'ADR 0001 a nommé en exigeant une Curation explicite plutôt qu'un filtre dérivé.

## Solution

**Pour le restaurateur.** Sur la fiche d'un Produit Formule dans l'admin, un écran de Curation liste les Composants de la Formule et, pour chacun, permet de cocher une par une les Variantes de la Carte autorisées dans ce slot. Ajouter un nouveau plat à la Carte ne l'ajoute à aucune Formule tant que personne ne l'a coché — c'est une corvée délibérée, pas un oubli à corriger.

**Pour le client.** Sur la page d'une Formule, un sélecteur par Composant — « Choisissez votre entrée », « Choisissez votre plat » — propose uniquement les Variantes curées pour ce slot. Le bouton d'ajout au panier reste désactivé tant qu'un Composant n'est pas rempli. Le prix affiché est celui de la Formule, fixe, et ne bouge jamais selon ce qui est choisi. Si un choix devient invalide entre l'ajout au panier et le paiement — une Variante retirée de la Curation entre-temps — le client est prévenu avant que son paiement ne soit autorisé, jamais après.

**Pour le système.** La Curation est un module `formule` avec un Module Link vers `ProductVariant` (ADR 0005) — aucune donnée dérivée d'une catégorie, d'une collection ou d'un tag. La Sélection du client est écrite en clés plates sur `line_item.metadata` au moment de l'ajout au panier, revalidée contre la Curation à deux moments : à l'ajout (pour donner une erreur exploitable tout de suite) et à la complétion du panier (le contrôle qui compte, parce que la Curation a pu changer entre-temps).

## User Stories

**Le restaurateur (Curation)**

1. En tant que restaurateur, je veux créer une Formule comme un Produit ordinaire de la Carte, afin qu'elle apparaisse, se prix et se publie exactement comme n'importe quel autre plat.
2. En tant que restaurateur, je veux définir les Composants d'une Formule — leur nom affiché et leur ordre — afin de structurer les slots que le client devra remplir.
3. En tant que restaurateur, je veux, pour chaque Composant, cocher une par une les Variantes de la Carte autorisées dans ce slot, afin qu'aucun plat n'entre dans une Formule à prix fixe sans que je l'aie décidé.
4. En tant que restaurateur, je veux que les Variantes proposées à cocher soient identifiées par leur nom lisible (« Samoussas Bœuf »), jamais par un identifiant technique, afin de curer une Formule sans avoir à connaître les IDs de mes propres plats.
5. En tant que restaurateur, je veux qu'ajouter un nouveau plat à la Carte ne l'ajoute à aucune Formule existante automatiquement, afin qu'un plat premium n'entre jamais silencieusement dans une formule à prix fixe.
6. En tant que restaurateur, je veux pouvoir retirer une Variante de la Curation d'un Composant à tout moment, afin de réagir à une rupture de stock ou à un changement de carte sans devoir republier la Formule.
7. En tant que restaurateur, je veux que le prix de la Formule reste un champ ordinaire de pricing Medusa, afin de le modifier exactement comme je modifie le prix de n'importe quel autre Produit.

**Le client (composition)**

8. En tant que client, je veux voir sur la page d'une Formule la liste de ses Composants et, pour chacun, les choix qui me sont offerts, afin de savoir ce que je dois décider avant de l'ajouter au panier.
9. En tant que client, je ne veux pas pouvoir ajouter une Formule au panier tant que je n'ai pas rempli chacun de ses Composants, afin de ne jamais me retrouver avec une commande incomplète à la cuisine.
10. En tant que client, je veux que le prix affiché sur la page et dans le panier soit celui de la Formule, fixe, quel que soit ce que j'ai choisi, afin de ne jamais être surpris par le total.
11. En tant que client, je veux pouvoir mettre au panier deux Formules identiques avec des choix différents, afin de commander par exemple deux Menus Midi qui n'ont pas la même entrée sans qu'ils se confondent en une seule ligne.
12. En tant que client, si l'un de mes choix n'est plus valide au moment de payer — un plat retiré de la Curation entre mon ajout au panier et mon paiement — je veux être prévenu avant que mon paiement ne soit autorisé, avec un message qui me dit quoi corriger, afin de ne jamais payer pour une commande que la cuisine ne pourra pas honorer telle quelle.
13. En tant que client, je veux que mon panier affiche clairement ce que j'ai choisi pour chaque Composant d'une Formule, afin de vérifier ma commande avant de payer.

**La cuisine et le développeur**

14. En tant que développeur, je veux que la Sélection soit revalidée contre la Curation au moment de la complétion du panier, pas seulement au moment de l'ajout, afin qu'un changement de Curation pendant que le client est sur la page de paiement soit pris en compte — le même raisonnement que la revalidation du Créneau à l'expiration.
15. En tant que développeur, je veux qu'aucun champ de prix ne soit jamais dérivé de la Sélection, afin que l'invariant de l'ADR 0001 — tout l'argent du système est calculé par le pricing engine de Medusa, rien d'autre — reste vrai après cette feature.
16. En tant que développeur, je veux que la clé technique d'un Composant (celle qui finit dans `line_item.metadata`) soit immuable une fois une première commande passée, afin de ne jamais orpheliner une Sélection déjà enregistrée sur une commande figée.
17. En tant que restaurateur, je veux que l'admin Medusa me montre lisiblement, sur une commande, ce que le client a sélectionné pour chaque Formule — pas un JSON brut — afin de savoir ce qu'il faut préparer sans deviner le contenu de `metadata`.
18. En tant que développeur, je veux que ce spec explicite ce qu'il ne fait pas — imprimer la Sélection sur le Ticket cuisine, gérer un Supplément payant — afin que la feature suivante sache exactement ce qu'elle doit reprendre plutôt que de redécouvrir la question.

## Implementation Decisions

### Un modèle `Formule` explicite, pas seulement des Composants

Une question restée ouverte par la recherche (§8) : où vit « ce Produit est une Formule » ? Décidé ici pour de bon : un modèle `Formule` explicite dans le module `formule`, une ligne par Produit Formule, qui porte l'identité et sert d'ancrage à l'écran d'admin. Les Composants lui appartiennent (relation Formule → Composants). Déduire « est une Formule » de la simple existence de Composants aurait marché aussi, mais aurait laissé la validation serveur (Implementation Decisions, plus bas) deviner un fait qui mérite d'être explicite.

### `key` technique vs `label` affiché, sur chaque Composant

Chaque Composant porte deux champs distincts : un `key` technique, stable, en anglais (`"starter"`, `"main"`) — c'est lui qui finit dans le nom de la clé de `line_item.metadata` (`formule_starter_variant_id`), donc un identifiant de code au sens d'AGENTS.md — et un `label` affiché, dans la langue de la carte (« Entrée »), pur texte d'UI. Séparer les deux évite de choisir entre respecter AGENTS.md (identifiants en anglais) et respecter ce que voit le client (français) : les deux existent, chacun à sa place. `key` est immuable après la création du Composant (User Story 16) ; `label` ne l'est pas.

### La Curation : écran sur la fiche du Produit Formule, pas une page de réglages globale

Contrairement aux Horaires de retrait (configuration globale du restaurant), la Curation est une propriété d'une Formule précise. Elle vit donc comme un widget sur la page de détail du Produit, visible seulement quand ce Produit est marqué comme Formule — pas comme une page de réglages séparée listant toutes les Formules à la fois. Chaque Composant y affiche son `label`, et une sélection multiple des Variantes de la Carte, listées par nom lisible (User Story 4) — jamais par ID.

### Une nouvelle route Store expose la Curation au client

Le storefront a besoin de savoir, pour une Formule donnée, quels Composants la composent et quelles Variantes sont curées dans chacun, afin de construire le sélecteur. Contrat exposé côté Store, en lecture seule : pour un produit Formule donné, la liste ordonnée de ses Composants (`key`, `label`, `rank`), chacun avec la liste des Variantes autorisées (id, titre, prix résolu par le pricing engine comme n'importe quelle Variante). Cette route ne fait que projeter la Curation ; elle n'écrit rien et ne connaît aucune Sélection.

### L'ajout au panier écrit la Sélection en clés plates, une par Composant

Reprend tel quel le contrat de l'ADR 0005 : à l'ajout d'une Formule au panier, le storefront envoie `metadata: { formule_<key>_variant_id: "<variant_id>", … }`, une clé par Composant de la Formule, valeur = string, jamais objet ni tableau. Le bouton d'ajout au panier reste désactivé tant qu'un Composant de la Formule n'a pas de valeur choisie (User Story 9) — c'est une contrainte d'UI, pas seulement de validation serveur.

### La validation serveur, aux deux hooks déjà nommés par l'ADR 0005

`addToCartWorkflow.hooks.validate` (et son équivalent sur `updateLineItemInCartWorkflow`) rejette immédiatement une Sélection incohérente : Composant manquant, clé en trop, Variante qui n'appartient pas à la Curation *de son Composant précis* — pas de la Formule en général, c'est le point qui protège la marge. `completeCartWorkflow.hooks.validate` refait exactement le même contrôle au moment de payer, parce que la Curation a pu changer entre-temps — le même raisonnement que la revalidation du Créneau à l'expiration (`src/workflows/hooks/complete-cart.ts` existant, à étendre, pas à dupliquer dans un second hook séparé : un seul hook `validate` par workflow revérifie Créneau et Sélection l'un après l'autre).

### Le message d'erreur au client, et sa récupération

Quand `completeCartWorkflow.hooks.validate` rejette une Sélection devenue invalide, le client ne doit pas atterrir sur une erreur générique : le message identifie quel Composant de quelle Formule est en cause, et le storefront doit permettre de corriger la Sélection sans recommencer tout le panier — le même principe de récupération gracieuse que la feature récente sur l'expiration du Créneau au paiement (`feat/reprise-creneau-expire`). La forme exacte de cet écran de récupération n'est pas tranchée ici ; c'est une décision d'implémentation storefront, pas un nouveau concept de domaine.

### Composants obligatoires, pas de doublon interdit

CONTEXT.md est explicite : un Composant est « un slot que le client doit remplir ». Décidé : en v1, aucun Composant n'est optionnel — une Formule à Composants partiellement remplis n'est pas une commande valide. Rien n'interdit en revanche de choisir la même Variante dans deux Composants différents d'une même Formule (par exemple la même boisson dans deux slots distincts, si une Formule en a) : aucune règle du domaine ne l'exclut, donc ce n'est pas bloqué.

## Testing Decisions

**Ce qui fait un bon test ici : le comportement observable, jamais l'implémentation** (AGENTS.md) — on regarde ce que la route accepte, rejette, ou persiste, jamais l'ordre d'appel interne d'un hook ou d'un service.

### Seam 1 — le contrôle Sélection-contre-Curation, en test unitaire pur

Mirroir de `src/lib/slots/__tests__/derive-slots.unit.spec.ts` : une fonction pure, sans base, qui prend une Curation (Composants → Variantes autorisées) et une Sélection soumise, et renvoie valide ou le motif de rejet. Cas couverts de façon exhaustive : Composant manquant, clé de Sélection qui ne correspond à aucun Composant, Variante hors Curation du Composant visé mais valide pour un autre Composant de la même Formule (le cas qui protège la marge), Sélection posée sur une ligne dont la Variante n'est pas une Formule.

### Seam 2 — le seam qui compte, en intégration HTTP

Étend le fixture déjà écrit dans `complete-cart.spec.ts` (Modules.PRODUCT, le Module Link `formule`) : un Produit Formule avec ses Composants et leur Curation posée via le lien. Contre une vraie base Postgres jetable :
- une Sélection invalide est rejetée à `POST /store/carts/:id/complete`, **avant** capture du paiement — même assertion que le test Créneau existant (`payment_collection.payment_sessions[0].status` reste `"pending"`) ;
- une Sélection valide survit verbatim jusqu'à `order.items[].metadata`, exactement comme le test Créneau le prouve déjà pour `order.metadata` ;
- deux Formules identiques aux Sélections différentes dans le même panier restent deux lignes distinctes, jamais fusionnées en `quantity: 2` — le point que la recherche a vérifié en JS pur (§1.3), ici vérifié contre une vraie base plutôt que supposé.

### Volontairement non testé

L'écran de Curation admin et le sélecteur storefront : vérification à la main, dev server ouvert — même précédent que le CRUD admin du module `pickup`, qui n'a aucun test HTTP automatisé (spec Notification de commande, § *Volontairement non testé*), et le storefront de ce repo n'a aucun framework de test du tout.

## Out of Scope

- **Le Ticket cuisine n'affiche pas encore les Sélections.** La spec Notification de commande l'a explicitement laissé en suspens en attendant cette feature (« le prochain slice, les Sélections de Formule, devra revisiter `kitchen-ticket.ts` »). Ce spec rend la Sélection correcte et lisible en admin ; l'imprimer sur le ticket 80mm est le prolongement suivant, pas celui-ci.
- **Le Supplément payant.** CONTEXT.md l'exclut explicitement du domaine aujourd'hui. Une Sélection en `metadata` ne peut structurellement porter aucun prix (ADR 0005) — c'est une propriété voulue, pas une limitation à contourner ici.
- **Le reporting sur les Sélections** (« combien de Menus Midi avec Samoussas Bœuf ce mois-ci »). L'ADR 0005 nomme déjà le déclencheur d'une migration future vers un module lié le jour où cette requête existe ; pas avant.
- **Les Composants optionnels.** Décidé plus haut : hors scope, tous les Composants d'une Formule sont obligatoires en v1.
- **La dénormalisation du nom de la Variante choisie** dans la Sélection, pour survivre à la suppression d'une Variante après coup. Signalé par la recherche (§8) comme prolongement utile, non tranché ici.

## Further Notes

Ce spec dépend d'une extension future de `kitchen-ticket.ts` pour que la cuisine voie enfin les Sélections — la spec Notification de commande a posé cette dépendance dans l'autre sens (« la future spec des Sélections de Formule devra poser comme exigence : doit pouvoir alimenter un ticket cuisine »). Elle est posée ici : la forme des clés de `line_item.metadata` (une par `formule_<key>_variant_id`) est ce que ce futur travail devra lire.

Le nom de la Variante disparaissant si elle est supprimée après une commande (Out of Scope, dernier point) mérite d'être tranché avant, ou au moment, où le Ticket cuisine apprend à lire les Sélections — pas après coup.
