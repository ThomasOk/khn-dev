# 01 — L'Annonce, de l'API à la bannière

**What to build:** La balle traçante. Une phrase écrite en base traverse toutes les couches et s'affiche en haut du site public, puis disparaît d'elle-même quand sa période est passée.

Le restaurateur (via HTTP pour l'instant, l'écran viendra en 03) crée une Annonce : une **accroche** d'une phrase et une **Période d'annonce** en jours civils, bornes incluses. Le visiteur voit cette phrase en bandeau en haut de chaque page de `(main)` — accueil, Carte, fiche produit, panier, réservation, pages légales. Jamais dans le tunnel de paiement. Quand la période ne couvre plus aujourd'hui, le bandeau n'est plus là, sans que personne n'ait rien dépublié.

Périmètre réduit exprès : pas de corps, pas de lien, pas d'écran admin, pas de contrôle de chevauchement. La bannière est **inerte** — elle ne se clique pas et ne le laisse pas croire. Elle n'est pas non plus fermable, et ce n'est pas un oubli (voir le glossaire).

Rappel de l'ADR 0009 : ce module ne lit **ni** les Fermetures exceptionnelles, **ni** les Créneaux, **ni** les Produits. Une Annonce est du texte écrit, jamais dérivé.

**Prefactor à faire en premier :** `nav-client` décide aujourd'hui de son opacité en inspectant `pathname`. Avec une Annonce présente le nav doit être opaque quel que soit le chemin. Sortir cette décision en prop plutôt que d'empiler une deuxième condition pathname dans le composant.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Prefactor : la décision « nav opaque » est passée en prop à `nav-client` au lieu d'être déduite de `pathname` en interne, comportement actuel inchangé
- [ ] Module Medusa custom `announcement`, avec son modèle et sa migration — jamais logé dans `pickup` (ADR 0009)
- [ ] Modèle réduit à `id`, `headline`, `start_date`, `end_date`. Les autres champs arrivent en 04
- [ ] `start_date` / `end_date` sont du **texte** `YYYY-MM-DD`, pas des `dateTime` — même choix et même raison que `pickup_closure`
- [ ] Validation zod : accroche trimmée de 1 à 90 caractères, dates au format `YYYY-MM-DD`, `end_date >= start_date` par comparaison de chaînes
- [ ] `GET /admin/announcements` (liste, période la plus proche d'abord) et `POST /admin/announcements`
- [ ] `GET /store/announcement` renvoie `{ announcement: { headline } | null }` — ni `id`, ni dates sur le fil
- [ ] La route store est le **seul lecteur d'horloge** : elle calcule le jour civil parisien courant puis fait une requête. Aucune fonction de dérivation n'est introduite
- [ ] `null` est une réponse normale, pas une erreur — c'est le cas courant
- [ ] Si plusieurs Annonces couvraient aujourd'hui (données hors API), la route en retourne une de façon déterministe et n'échoue pas
- [ ] Storefront : lecture via le SDK Medusa, jamais un `fetch` brut, avec `next: { revalidate: 60 }` — divergence assumée avec `listPickupSlots` qui est en `no-store`, justifiée dans la spec
- [ ] Nouveau dossier de feature `announcement` côté storefront, suivant le découpage existant
- [ ] Bannière rendue **côté serveur** dans le layout de `(main)`, en flux normal sous le nav, au même emplacement que `CartMismatchBanner`
- [ ] La bannière n'apparaît **pas** dans `(checkout)`
- [ ] Quand une Annonce est présente, le nav est forcé opaque via le prefactor ci-dessus
- [ ] La bannière est une région `role="status"`, pas `alert`
- [ ] Aucun bouton de fermeture, aucun `localStorage`, aucune persistance côté client
- [ ] Pas de saut de mise en page au chargement : la bannière est dans le HTML initial
- [ ] Test d'intégration HTTP : création acceptée et relue par la liste admin
- [ ] Test d'intégration HTTP : l'Annonce dont la période couvre aujourd'hui est servie, avec les seuls champs du contrat
- [ ] Test d'intégration HTTP : bornes **incluses** — `start_date === end_date === aujourd'hui` s'affiche
- [ ] Test d'intégration HTTP : `null` sur période entièrement passée, entièrement future, et sur base vide
- [ ] Test d'intégration HTTP : refus de validation sur accroche vide, accroche au-delà du plafond, `end_date` avant `start_date`, date malformée
- [ ] Les périodes des tests sont semées **relativement à aujourd'hui** via le helper `paris-time`, comme `pickup-slots.spec.ts` sème son horaire relativement à maintenant
- [ ] Aucun seam unitaire ajouté : il n'y a pas de dérivation pure à isoler, et le passage instant → jour civil parisien est déjà couvert par les tests de `restaurant-time`
