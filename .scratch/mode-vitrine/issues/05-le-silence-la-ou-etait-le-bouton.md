# 05 — Le silence là où était le bouton

**What to build:** Les tickets 03 et 04 ont retiré les moyens de commander. Là où une Note de vitrine existe, l'encadré explique. Partout ailleurs, il ne reste qu'un blanc — et à deux endroits, ce blanc ment.

Sur la Carte, le panier vide continue de dire « Ajoutez un plat depuis la carte pour commencer votre commande », à quelques centimètres d'un encadré qui annonce le contraire, et alors qu'il n'existe plus un seul bouton d'ajout sur la page. Sur `/cart`, un client qui ouvre un panier vide pendant la suspension ne reçoit **aucune** explication : l'encadré est enfermé dans la branche « panier rempli », et l'écran qu'il obtient l'invite à aller ajouter un plat qu'il ne pourra pas ajouter.

Ce ticket pose une **étiquette d'état** à l'endroit exact où était le bouton « Commander », et la fait apparaître aussi bien sur un panier rempli que sur un panier vide. Pendant la suspension le panier vide est le cas dominant — plus personne ne pouvant ajouter, seuls les paniers composés avant la bascule sont remplis.

Masquer le panier pendant le Mode vitrine a été envisagé et écarté : un panier rempli qui disparaît se lit comme un panier vidé, et l'étiquette rend le même service sur un panier vide sans toucher à la grille de la Carte, au repli de la barre mobile ni à l'ouverture automatique du menu déroulant.

**Blocked by:** 03 — La Carte en vitrine, et 04 — Le reste du parcours. Tous deux livrés.

**Status:** ready-for-agent

## Amendement de spec — à faire en premier

- [x] La décision 6 de `docs/specs/mode-vitrine.md` interdit **toute phrase de repli écrite dans le rendu**, et ses *Further Notes* nomment ce mouvement d'avance. Ce ticket en introduit une, délibérément : l'amendement se fait dans la spec avant le code, faute de quoi le premier relecteur révoque ce travail en citant le paragraphe
- [x] La distinction à enregistrer : la **Note de vitrine** est une *explication* — « la friteuse est en panne, on rouvre à 14h » — qui vient toujours de la base et dont l'absence reste une absence ; l'**étiquette d'état** ne dit que *l'état*, au même titre que « Votre panier est vide » ou « 0 articles », déjà en dur dans ces composants
- [x] La règle « pas d'encadré quand il n'y a pas de note » n'est **pas** touchée : l'encadré reste piloté par la Note seule

## L'étiquette

- [x] Nouveau composant `orders-suspended-label` sous `apps/storefront/src/modules/showcase/components/`, à côté de `showcase-notice` — un seul endroit décide de cette formulation
- [x] Texte **court et non explicatif** (« Commandes suspendues »). Dès qu'il commence à dire *pourquoi*, il empiète sur la Note de vitrine et redevient la phrase de repli que la décision 6 refuse
- [x] Pas de `role="status"` : c'est du contenu statique présent dès le premier rendu serveur, et `ShowcaseNotice` porte déjà ce rôle — deux régions `status` sur la même page se marchent dessus
- [x] L'étiquette s'affiche **que la Note existe ou non**. Contrairement à l'encadré, son affichage ne dépend pas de la Note : c'est un état, et l'état est vrai dans les deux cas
- [x] Traitement visuel discret, à sa place dans le flux — elle occupe l'emplacement d'un bouton, elle ne doit ressembler ni à l'encadré ni à la bannière d'Annonce

## Sur la Carte

- [x] `apps/storefront/src/modules/store/components/carte-cart-content/index.tsx`, branche remplie : l'étiquette prend la place **exacte** du bouton « Commander »
- [x] Même fichier, branche vide : l'invitation « Ajoutez un plat depuis la carte pour commencer votre commande » disparaît quand le mode est actif — elle invite à une action qui n'existe plus. « Votre panier est vide. » reste
- [x] L'étiquette s'affiche **aussi** dans la branche vide. Ne traiter que l'emplacement du bouton laisserait sans rien le cas que voit presque tout le trafic pendant la suspension
- [x] Sans l'étiquette, retirer l'invitation laisserait « Votre panier est vide. » seul, sans dire pourquoi il va le rester — et si le restaurateur a coupé sans écrire de Note, il n'y a pas d'encadré sur la page : l'étiquette est alors le **seul** signal dans la colonne
- [x] Ne toucher que ce composant pour la Carte : la colonne sticky desktop et la barre mobile le rendent toutes les deux, donc une seule correction couvre les deux surfaces. Y ajouter une seconde version serait exactement ce que le commentaire en tête du fichier interdit

## Sur la page panier

- [x] `apps/storefront/src/modules/cart/templates/index.tsx` : `ShowcaseNotice` sort de la branche `cart?.items?.length` et s'affiche **aussi** sur le panier vide. Aujourd'hui ce client n'a aucune explication et suit un lien vers une Carte sans boutons (User Stories 22 et 25)
- [x] `apps/storefront/src/modules/cart/components/empty-cart-message/` : la même invitation fautive est retirée quand le mode est actif ; le composant reçoit l'état en prop depuis le template, qui le tient déjà
- [x] Le lien « Découvrir la carte » est **conservé** : la Carte vaut toujours le détour, c'est le principe même de la vitrine

## Ce que ce ticket ne touche pas

- [x] Le panier n'est **jamais masqué** : ni la colonne sticky, ni la barre mobile, ni sur un panier vide. Donc aucune modification de la grille `small:grid-cols-[1fr_360px]`, du `CarteCartBarFallback`, ni de `hasVisibleCartColumn` dans le menu déroulant
- [x] L'icône et le badge du panier dans le nav restent inchangés (ticket 03)
- [x] Le **menu déroulant du panier** reste inchangé : il n'a aucun bouton de paiement, donc aucune action ne lui a été retirée et il n'a rien à expliquer. Lui faire descendre l'état vitrine à travers `cart-button` et le nav serait un coût sans contrepartie
- [x] Le panier reste **modifiable** partout où il l'est aujourd'hui — quantités et suppression de ligne (ticket 04)
- [x] La bannière d'Annonce n'est ni masquée ni modifiée, et réciproquement (ADR 0009)

## Vérification

- [x] Aucun test automatisé, pour la même raison qu'en 03 et 04 : `apps/storefront` n'a ni runner ni script `test`, et introduire ce seam est une décision à part entière
- [x] Vérification à la main sur cinq états : la Carte en {panier vide, panier rempli} × {mode éteint, mode actif}, puis `/cart` avec un panier vide en mode actif — celui qui n'affichait rien du tout
- [x] Mode éteint : les deux branches sont strictement inchangées, invitation comprise. La vanne ne doit pas fuir dans l'autre sens
