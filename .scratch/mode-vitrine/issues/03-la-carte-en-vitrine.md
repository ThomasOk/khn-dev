# 03 — La Carte en vitrine

**What to build:** Ce que le client voit. La page Carte reste entière — sections, photos, descriptions, prix — mais tous les moyens de commander en disparaissent, et un encadré explique pourquoi à l'endroit exact où ils étaient.

Plus aucun sélecteur de Variante, aucun bouton d'ajout, aucun composeur de Formule. Ni bouton de paiement dans la colonne panier (desktop) ni dans la barre panier (mobile) — mais le **contenu** du panier reste affiché aux deux endroits : le panier est conservé intact, seulement impayable. L'icône panier du nav survit, la faire disparaître donnerait à croire que le panier a été vidé.

Ce ticket amène aussi la tuyauterie que 04 réutilisera : la lecture côté storefront, avec ses **deux politiques de cache**, et le composant d'encadré.

Rappel du glossaire : **s'il n'y a pas de note, il n'y a pas d'encadré.** La Carte est alors simplement dépourvue de moyens de commander, sans explication. C'est une décision prise en connaissance de cause — le pré-remplissage du formulaire admin (ticket 02) est ce qui la rend rare en pratique, pas une phrase écrite en dur dans le rendu.

**Prefactor à faire en premier :** les trois cartes de la Carte (Produit, Plat, Formule) portent chacune leur propre zone d'action. Faire descendre **une seule** décision « commande possible » depuis la page, plutôt que trois lectures indépendantes — sans quoi le jour où un quatrième type de carte arrive, l'oubli est invisible.

**Blocked by:** 01 — La vanne, de bout en bout.

**Status:** ready-for-agent

- [ ] Prefactor : la décision « commande possible » est calculée une fois au niveau de la page Carte et passée aux cartes, au lieu d'être déduite indépendamment dans chacune. Comportement actuel inchangé
- [ ] Lecture de l'état via le **SDK Medusa**, jamais un `fetch` brut (`AGENTS.md`)
- [ ] Le module de lecture exporte **deux fonctions nommées distinctes** : une en `next: { revalidate: 60 }` pour les pages publiques, une en `cache: "no-store"` pour le panier et le tunnel (utilisée en 04)
- [ ] Deux fonctions plutôt qu'un paramètre booléen : la politique de cache doit se lire sur le site d'appel, sans ouvrir la définition
- [ ] Conséquence assumée et à ne pas « corriger » : un bouton d'ajout peut survivre jusqu'à une minute sur une page publique après la bascule. Le backend refuse de toute façon (ticket 01)
- [ ] Nouveau dossier de feature `showcase` côté storefront, suivant le découpage existant
- [ ] Sur la Carte, quand le mode est actif : plus de sélecteur de Variante, plus de bouton d'ajout sur les cartes Produit, Plat et Formule, et plus de composeur de Formule
- [ ] Plus de bouton de paiement dans la colonne panier (desktop) ni dans la barre panier (mobile)
- [ ] Le **contenu** du panier reste affiché dans la colonne comme dans la barre : rien n'est supprimé, le panier est seulement impayable
- [ ] L'icône panier du nav est conservée
- [ ] Les boutons sont **absents**, pas présents et inertes : rien ne doit inviter à s'acharner dessus
- [ ] L'encadré porte la Note de vitrine en **texte brut**, sauts de paragraphe préservés, jamais de `dangerouslySetInnerHTML`
- [ ] L'encadré est une région `role="status"` — il informe, il n'interrompt pas
- [ ] Aucun bouton de fermeture, aucun lien, aucun `localStorage`, aucune persistance côté client
- [ ] **Pas d'encadré quand il n'y a pas de note**, et aucune phrase de repli écrite dans le rendu
- [ ] L'encadré vit **dans le flux de la page**, là où les boutons étaient, avec un traitement visuel **distinct de la bannière d'Annonce** : les deux ne doivent jamais se lire comme deux bannières empilées
- [ ] La bannière d'Annonce n'est ni masquée ni modifiée par le Mode vitrine, et réciproquement — aucun des deux ne pilote l'autre (ADR 0009)
- [ ] Sur mobile, l'encadré tient dans l'écran sans repousser toute la Carte hors de vue
- [ ] Pas de saut de mise en page au chargement : l'état est lu côté serveur et l'encadré est dans le HTML initial
- [ ] Aucun test automatisé : `apps/storefront` n'a ni runner ni script `test`, et introduire ce seam est une décision à part entière. Vérification à la main, lacune consciente déjà enregistrée par la spec Annonces
