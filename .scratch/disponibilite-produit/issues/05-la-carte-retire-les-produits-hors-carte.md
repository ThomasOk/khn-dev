# 05 — La Carte retire les Produits hors carte

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « Le contrat Store » (lecture storefront), § « Le storefront : Carte, page produit, barre de nav », User Stories 12–17
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md) — § « Why the Carte cannot learn this from `/store/products` », § *Consequences*

**Status:** ready-for-agent

**Blocked by:** 01 (la barre de nav doit déjà savoir ignorer une section absente), 03 (sans le widget, aucun horaire à saisir pour vérifier à la main), 04 (la route Store).

## What to build

Le résultat visible de toute la feature : à 20h, la Formule Menu Midi n'est plus sur la Carte ; à 12h30, elle y est comme n'importe quel autre Produit.

**La lecture.** Une fonction de la couche données du storefront lit `GET /store/product-availability` avec `next: { revalidate: 60 }` — la forme exacte de la lecture du Mode vitrine, sur la même page, pour la même raison. Elle est appelée **dans le `Promise.all` du shell** de la page Carte, en parallèle des catégories et du Mode vitrine, et son résultat descend vers les sections comme la décision « commande possible » descend déjà. Ne pas en faire une lecture non cachée, et ne pas la faire depuis le navigateur : le HTML doit arriver avec le Produit **déjà** retiré, sinon le client voit un plat apparaître puis disparaître et croit à un bug.

**Le filtrage.** Les Produits dont `available_now` est `false` ne sont pas rendus. Un Produit absent de la réponse de la route n'a aucun horaire : il est rendu, comme aujourd'hui.

**La section vide.** Rien à écrire : la section d'une catégorie retourne déjà `null` quand il ne lui reste aucun Produit. Vérifier que c'est bien ce qui se produit quand toutes les formules sont hors carte.

**La barre de nav.** Rien à écrire non plus, si le ticket 01 est passé : l'entrée d'une section absente du DOM disparaît toute seule. Vérifier.

**Ce qu'il ne faut pas faire.** Ne pas filtrer dans `/store/products` ni toucher au `force-cache` de la liste des produits (ADR 0013). Ne pas réimplémenter la règle horaire côté storefront pour gagner la minute de latence : ce serait une seconde implémentation dans un codebase sans tests, et la garantie « la Carte ne propose jamais ce que le paiement refusera » tomberait. La minute de retard est assumée — le Produit reste affiché jusqu'à 14h01 au pire, mais il n'est plus ajoutable au panier dès 14h00, parce que le serveur refuse (ticket 07).

## Acceptance criteria

- [ ] La page Carte lit la disponibilité via une fonction de la couche données en `revalidate: 60`, appelée dans le `Promise.all` du shell
- [ ] Aucune requête depuis le navigateur : le HTML servi ne contient déjà plus le Produit hors carte
- [ ] Un Produit hors carte n'apparaît pas sur la page Carte ; le même Produit dans sa plage y apparaît normalement, avec son sélecteur et son bouton
- [ ] Un Produit sans aucun horaire apparaît toujours, à toute heure
- [ ] Une section dont tous les Produits sont hors carte disparaît entièrement — titre compris
- [ ] L'entrée de cette section disparaît de la barre de navigation
- [ ] `/store/products` n'est pas modifié et son `force-cache` est intact
- [ ] La règle horaire n'est réimplémentée nulle part côté storefront
- [ ] Vérification à la main, dev server : saisir une plage passée sur la Formule Menu Midi et recharger la Carte ; saisir une plage englobant l'instant courant et recharger
