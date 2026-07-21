# 03 — La Carte s'affiche en sections et un plat s'ajoute au panier sans quitter la page

**Spec :** [docs/specs/commande-depuis-la-page-carte.md](../../../docs/specs/commande-depuis-la-page-carte.md) — User Stories 1, 6, 7, 8, 9, 10, 15, 16, 17, 29, 31, 40, 41 ; §§ « La Carte vit sur la route de listing existante », « Les sections sont les catégories racines, ordonnées par le restaurateur », « Les cartes consomment le Produit déjà chargé », « La Carte ne pagine pas », « La carte n'est plus un lien qui enveloppe tout son contenu »
**Maquette :** [docs/specs/assets/commande-depuis-la-page-carte/maquette.png](../../../docs/specs/assets/commande-depuis-la-page-carte/maquette.png) — sections « ENTRÉES », cartes de plats avec sélecteur et bouton

**Status:** ready-for-agent

**Blocked by:** 01 (sans Carte en base, rien de ce ticket ne se voit) et 02 (le sélecteur doit être utilisable hors page produit).

## What to build

Le premier parcours complet, de bout en bout : le client arrive sur la Carte, voit les plats, en met dans son panier, sans jamais changer de page.

**La Carte prend la place de la page de listing existante** (`/store`), déjà intitulée « La carte » et qui charge déjà la liste des catégories. Aucune route n'est créée. La rangée de pastilles de catégories qu'elle affiche aujourd'hui disparaît — sa remplaçante, la barre d'ancres, est le ticket 04 ; ici, les sections se suivent simplement les unes après les autres.

**Une section est une catégorie racine**, et les sections apparaissent dans l'ordre du rang de ces catégories — celui que l'admin permet de réordonner en glisser-déposer. Le chargement des catégories ne demande pas ce champ aujourd'hui et ne trie sur rien : l'ordre d'affichage est donc actuellement accidentel. L'ordre d'une carte de restaurant n'est pas cosmétique, et il appartient au restaurateur (User Story 40), jamais à un tableau écrit en dur dans le code.

**Une section liste les Produits de sa catégorie et de toutes ses descendantes.** Dans Medusa, un Produit rangé dans une sous-catégorie n'appartient pas à sa catégorie parente : sans cette remontée, ranger un plat un cran plus bas le ferait disparaître de la Carte sans le moindre signal. Les sous-catégories ne s'affichent pas comme sous-titres — elles servent au rangement, pas à la lecture. Un Produit ne doit apparaître qu'une fois, même si le rangement le rend atteignable par deux chemins.

**La Carte ne pagine plus.** Chaque section s'affiche entière. Lire une carte de restaurant par pages de douze est un contresens. C'est tenable parce que le ticket 02 a supprimé le rechargement par carte : afficher la Carte coûte le chargement des Produits, que la page fait de toute façon.

**Chaque Produit ordinaire est commandable sur place** : son sélecteur de Variante et son bouton d'ajout au panier sont sur sa carte. Un Produit à Variante unique s'ajoute en une seule action ; un Produit à plusieurs Variantes n'est ajoutable qu'une fois la sienne choisie. Ce que le client choisit sur une carte ne touche aucune autre carte de la page. L'ajout emprunte exactement le chemin existant — même appel, mêmes validations serveur, même invalidation de cache — et le même Produit ajouté deux fois avec deux choix différents fait bien deux lignes de panier.

**La carte cesse d'être un lien qui enveloppe tout son contenu.** Aujourd'hui la vignette entière est un lien vers la page produit ; y insérer un sélecteur et un bouton rendrait le geste ambigu — ouvrir une liste déroulante déclencherait la navigation. Seuls l'image et le titre restent cliquables, la zone d'action ne l'est jamais. La page produit reste ainsi atteignable, et les routes de catégorie continuent de répondre : rien de ce qui existe ne casse.

Les Formules sont **hors de ce ticket** : elles apparaîtront dans leur section, mais leur composition en ligne est le ticket 05. Ce qu'elles affichent en attendant n'a pas à être soigné ici.

## Acceptance criteria

- [ ] La Carte s'affiche sur la route de listing existante, sans qu'aucune route nouvelle soit créée
- [ ] Les sections apparaissent dans l'ordre du rang des catégories racines ; réordonner ces catégories dans l'admin change l'ordre affiché, sans redéploiement
- [ ] Un Produit rangé dans une sous-catégorie apparaît dans la section de sa catégorie racine, et n'y apparaît **qu'une fois**
- [ ] Chaque section affiche tous ses Produits — aucune pagination, aucun bouton « page suivante »
- [ ] Un Produit à Variante unique s'ajoute au panier en une seule action depuis la Carte
- [ ] Un Produit à plusieurs Variantes n'est ajoutable qu'une fois sa Variante choisie, et c'est bien la Variante choisie qui arrive au panier
- [ ] Choisir une Variante sur une carte ne modifie aucune autre carte de la page, et n'écrit rien dans l'URL
- [ ] Le même Produit ajouté deux fois avec deux Variantes différentes produit deux lignes de panier distinctes
- [ ] Cliquer l'image ou le titre mène à la page produit ; ouvrir le sélecteur ou cliquer le bouton d'ajout ne navigue jamais
- [ ] **Contrôle qui ne se voit pas à l'écran** : afficher la Carte complète ne déclenche pas un chargement de Produit par carte — vérifié au nombre de requêtes serveur
- [ ] Les routes de catégorie existantes répondent toujours
