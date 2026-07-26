# 04 — Le reste du parcours

**What to build:** Fermer les autres portes. La Carte n'est pas le seul endroit d'où l'on commande : Google dépose du monde directement sur une fiche produit, un client peut ouvrir un panier déjà rempli, et un autre peut être resté dans le tunnel de paiement au moment de la bascule.

La fiche produit et la page panier perdent leurs boutons et gagnent le même encadré que la Carte. Le menu déroulant du panier perd son bouton de paiement. Et le client déjà engagé dans le tunnel est ramené sur son panier — l'endroit qui sait expliquer la situation, et où son panier l'attend intact — plutôt que de se heurter au refus serveur au moment de valider.

Ce ticket ne construit aucune tuyauterie : il applique le lecteur, le prédicat et l'encadré livrés en 03 aux surfaces restantes.

**Blocked by:** 03 — La Carte en vitrine.

**Status:** ready-for-agent

- [ ] Sur la fiche produit, quand le mode est actif : plus d'action d'ajout, ni pour un Produit ordinaire ni pour une Formule
- [ ] La fiche produit reste entièrement consultable — description, galerie, prix
- [ ] L'encadré s'affiche sur la fiche produit, à l'endroit où les actions étaient
- [ ] Sur la page panier : plus de bouton de passage au paiement, et l'encadré s'affiche au-dessus du récapitulatif, avant que le client ne cherche le bouton
- [ ] Le contenu du panier reste affiché et modifiable (suppression de ligne), afin qu'un client puisse corriger son panier en attendant la réouverture
- [ ] Dans le menu déroulant du panier : plus de bouton de paiement
- [ ] Partout ailleurs où un bouton d'ajout existerait — accueil, plat du moment — il disparaît aussi
- [ ] À l'entrée du groupe de routes `(checkout)` : **lecture fraîche** (la fonction `no-store` livrée en 03), et redirection vers la page panier si le mode est actif
- [ ] La redirection est préférée à la neutralisation de chaque étape du tunnel : on ramène le client là où l'explication et son panier se trouvent déjà
- [ ] Le reste du site demeure entièrement navigable : accueil, à propos, contact, pages légales, et la **Réservation de table**, que le Mode vitrine ne touche jamais (ADR 0007)
- [ ] Une revue rapide confirme qu'aucune surface d'ajout ou de paiement n'a été oubliée, l'icône panier du nav restant la seule exception délibérée
- [ ] Aucun test automatisé, pour la même raison qu'en 03
