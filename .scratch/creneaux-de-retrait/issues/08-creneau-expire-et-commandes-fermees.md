# 08 — Le créneau expiré : reprise, et état Commandes fermées

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « Le comportement quand la validation rejette », § « Further Notes »

**Status:** ready-for-agent

**Blocked by:** 06 (le sélecteur, vers lequel on ramène le client), 07 (le rejet, qu'on attrape).

## What to build

**Le cas de 13h55.** Un client a choisi le dernier créneau du service, il hésite sur la page de paiement, et son créneau expire pendant qu'il y est. Il clique sur « payer » : le serveur refuse.

**Ce n'est pas un cas limite exotique — c'est un événement quotidien**, à chaque fin de service. Il mérite d'être traité comme un **chemin normal du produit**, pas comme une erreur technique. C'est la raison pour laquelle le comportement de reprise est spécifié plutôt que laissé à l'implémentation.

Le storefront attrape le rejet du hook `validate` et :

- **conserve le panier intact** — le client ne recommence rien ;
- **ramène le client à l'étape de retrait**, avec un message explicite qui nomme le créneau perdu (« Votre créneau 13h45–14h00 n'est plus disponible ») ;
- **rafraîchit la liste** des créneaux offrables.

**Pas de réattribution automatique.** On ne décide pas de l'heure de retrait à la place du client — c'est lui qui vient au comptoir.

Et si, à ce moment-là, `commandes_ouvertes` vaut `false`, le storefront affiche l'état **Commandes fermées** plutôt que de laisser le client tourner sur une liste vide. C'est précisément ce que le drapeau permet de distinguer d'une erreur réseau.

## L'état Commandes fermées

Il ne concerne pas que la reprise après rejet. Un client qui arrive sur le site **à 23h ou un jour de Fermeture exceptionnelle** doit pouvoir **consulter la carte** — elle reste browsable — mais comprendre **immédiatement** qu'il ne peut pas commander maintenant. On ne le laisse pas remplir un panier pour rien, ni payer pour rien.

Les commandes sont **same-day** : « plus de créneau aujourd'hui » veut dire « pas de commande », jamais « commande pour demain ».

## Acceptance criteria

- [ ] Quand le hook `validate` rejette pour créneau périmé, le client est ramené à l'étape de retrait **avec son panier intact** — aucune ligne perdue
- [ ] Le message nomme le créneau qui vient d'expirer, et la liste des créneaux affichée est **rafraîchie**
- [ ] Aucun créneau n'est réattribué automatiquement à la place du client
- [ ] Si `commandes_ouvertes` vaut `false` au moment de la reprise, l'état **Commandes fermées** s'affiche au lieu d'une liste vide — le client ne boucle pas indéfiniment
- [ ] Un client qui arrive quand plus aucun créneau n'est offrable (tard le soir, un jour de Fermeture exceptionnelle) peut **consulter la carte** mais voit qu'il ne peut pas commander maintenant
- [ ] Le rejet « aucun créneau sur le panier » et le rejet « créneau plus offrable » mènent à des messages différents — ils viennent de deux erreurs distinctes (ticket 07)
- [ ] Vérification à la main, en forçant l'expiration : aucune infra de test React n'est mise en place ici
