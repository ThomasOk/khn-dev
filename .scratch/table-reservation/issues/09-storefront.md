# 09 — Le storefront

**What to build:** Le parcours client complet, sur des routes déjà stables et testées. Une page de réservation autonome : le client choisit une date et un nombre de Couverts, voit les Heures de réservation réellement disponibles, laisse nom, email, téléphone et une note éventuelle, et repart avec une confirmation immédiate. Plus une page d'annulation, où atterrit le lien de l'email.

Aucune interaction avec le panier, le tunnel de commande ou Stripe : une Réservation n'est pas une Commande et ne partage rien avec elle.

Le point de soin est le **groupe qui grossit**. Passer de 4 à 5 personnes est fréquent, et le produit oblige à annuler puis refaire, au risque de perdre son créneau. C'est le seul endroit où ce système est franchement moins bon qu'un outil du marché, c'est assumé, et le texte doit pousser vers le téléphone dans ce cas précis plutôt que de se contenter d'un bouton « Annuler ».

**Blocked by:** 05 — Annuler, et 08 — Les garde-fous (on n'expose pas un formulaire public sans limite de fréquence).

**Status:** ready-for-agent

- [ ] Page de réservation autonome, hors du groupe de routes du checkout
- [ ] Appels via le SDK JS Medusa, jamais en `fetch` brut
- [ ] Le client choisit date et Couverts, et ne voit que des heures réellement réservables
- [ ] Au-delà de la taille de groupe maximale, la page affiche franchement le téléphone du restaurant au lieu d'un formulaire qui ne mènerait à rien
- [ ] Quand il n'y a aucune heure, la page dit **pourquoi** (jour fermé, hors horizon, service passé) au lieu d'afficher une liste vide
- [ ] Confirmation affichée immédiatement après la réservation, avec le récapitulatif
- [ ] Page d'annulation recevant le lien à jeton de l'email, avec un état clair quand la Réservation est déjà annulée
- [ ] Les textes poussent vers le téléphone pour la modification, en particulier l'agrandissement du groupe
- [ ] Le téléphone du restaurant est visible sur la page, pour les cas que le formulaire ne couvre pas
- [ ] Aucune infra de test React n'est mise en place — vérification à la main, comme pour le checkout des Créneaux
