# 09 — Les heures d'une Variante sur l'écran de Curation

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « Le storefront : Carte, page produit, barre de nav » (dernier point), User Story 29
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md) — § « Why Hors carte does not propagate into a Formule's Curation »

**Status:** ready-for-agent

**Blocked by:** 03 (les Horaires doivent être lisibles depuis l'admin).

## What to build

Une petite retouche d'admin qui porte une décision entière.

L'ADR 0013 a refusé de faire disparaître les Variantes hors carte des Composants d'une Formule : filtrer ouvrirait une cascade — un Composant pourrait tomber à zéro choix, or tout Composant est obligatoire, donc la Formule deviendrait impossible à remplir, donc elle devrait disparaître à son tour — et une Formule qui s'évapore parce qu'un plat qu'elle liste s'est arrêté à 18h n'est explicable par aucun écran.

Le garde-fou reste donc **humain**, comme la Curation l'a toujours été. Ce ticket lui donne l'information qui lui manque : sur l'écran de Curation, chaque Variante affiche son Horaire de disponibilité à côté de son nom — « Nems du soir *(servi 18h–22h)* ». Le restaurateur voit ce qu'il fait au moment où il coche, plutôt que de découvrir trois semaines plus tard qu'un plat du soir entre dans une formule du midi.

**Purement informatif.** Rien n'est filtré, rien n'est désactivé, aucune Variante n'est empêchée d'être curée où que ce soit. Une Variante sans horaire n'affiche rien de particulier — la mention n'apparaît que là où elle dit quelque chose, sinon elle devient du bruit sur la totalité de la liste.

## Acceptance criteria

- [ ] Sur l'écran de Curation, une Variante dont le Produit porte des Horaires de disponibilité affiche ces heures à côté de son nom
- [ ] Une Variante dont le Produit n'a aucun horaire s'affiche exactement comme aujourd'hui
- [ ] Aucune Variante n'est filtrée, désactivée ou rendue non cochable par cet affichage
- [ ] La lecture des horaires ne dégrade pas visiblement le chargement de l'écran de Curation
- [ ] Vérification à la main dans l'admin (dev server) — même précédent que le reste du CRUD de Curation
