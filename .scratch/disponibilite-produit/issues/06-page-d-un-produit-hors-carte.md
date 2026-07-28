# 06 — La page d'un Produit hors carte reste vivante

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « Le storefront : Carte, page produit, barre de nav », User Stories 18–21
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md) — § *Consequences*, « The Produit's own page stays reachable, and must »

**Status:** ready-for-agent

**Blocked by:** 05 (la lecture storefront de la disponibilité y est créée et sert ici).

## What to build

Un Produit hors carte quitte la Carte, mais **pas le web**. Sa page dédiée s'affiche normalement — titre, image, description, prix — et remplace le bloc d'ajout au panier par la mention des heures auxquelles il est servi : « Disponible le midi, de 11h30 à 14h00 », construite depuis les `schedules` que la route renvoie déjà.

**Jamais de `notFound()`.** C'est le point non négociable de ce ticket. La spec *Commander depuis la page Carte* garantit que la page dédiée d'un Produit reste atteignable pour « liens directs, partage, référencement ». Si le Hors carte la faisait passer en 404, l'URL alternerait 200 et 404 plusieurs fois par jour, tous les jours — c'est ainsi qu'une page se fait désindexer, et on aurait payé un coût de référencement pour une règle d'affichage.

**Le prix reste affiché.** Le client qui tombe sur la page à 20h doit apprendre qu'il existe un Menu Midi à 13,90 € et savoir quand revenir. C'est la valeur commerciale que le retrait de la Carte détruirait s'il allait jusqu'à cacher la page.

**Pas de bouton.** Aucun contrôle d'ajout au panier, aucun sélecteur de Variante actif, aucun sélecteur de Composant pour une Formule : rien qui invite à une action que le serveur refusera.

## Acceptance criteria

- [ ] La page d'un Produit hors carte répond 200 et rend titre, image, description et prix
- [ ] Aucun `notFound()` ni redirection n'est déclenché par l'état hors carte
- [ ] Le bloc d'ajout au panier est remplacé par la mention des heures de service, construite depuis les horaires renvoyés par la route
- [ ] Pour une Formule hors carte, les sélecteurs de Composants ne sont pas proposés
- [ ] La page du même Produit dans sa plage est inchangée par rapport à aujourd'hui
- [ ] La page d'un Produit sans aucun horaire est inchangée, à toute heure
- [ ] Aucun second appel réseau : les heures viennent de la lecture créée au ticket 05
- [ ] Vérification à la main, dev server, sur une Formule dont la plage est passée puis courante
