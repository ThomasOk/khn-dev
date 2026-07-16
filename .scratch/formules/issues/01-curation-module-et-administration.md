# 01 — Le module `formule` et l'administration de la Curation

**Spec :** [docs/specs/formules.md](../../../docs/specs/formules.md) — § « Un modèle `Formule` explicite, pas seulement des Composants », § « `key` technique vs `label` affiché », § « La Curation : écran sur la fiche du Produit Formule »
**ADR :** [0001](../../../docs/adr/0001-formules-as-flat-priced-produits.md) — une Formule est un Produit à Variante unique, la Curation est explicite et jamais dérivée ; [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) — la Curation vit dans un module `formule` + Module Link vers `ProductVariant`

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement.

## What to build

Rien n'existe aujourd'hui pour dire « ce Produit est une Formule » ni pour cocher, un par un, les Variantes autorisées dans chacun de ses slots. Ce ticket construit ce socle, entièrement côté administration — aucune surface client dedans, c'est le ticket 02.

**Le module.** Un modèle `Formule`, une ligne par Produit marqué comme tel (identité + ancrage de l'écran d'admin — décidé explicitement dans le spec plutôt que déduit de l'existence de Composants). Un modèle `FormuleComposant` qui lui appartient, portant `key`, `label` et `rank`. La Curation elle-même — la liste des Variantes autorisées par Composant — est un **Module Link** many-to-many vers `ProductVariant` (`ProductModule.linkable.productVariant`, vérifié comme existant à l'exécution dans la recherche associée), jamais une colonne dérivée d'une catégorie, d'une collection ou d'un tag. Aucune colonne de prix sur la table de lien, jamais — la Curation ne porte aucun argent.

**L'administration.** Routes admin pour : créer/lister/modifier les Composants d'une Formule, et associer/dissocier des Variantes à un Composant. Un widget sur la fiche du Produit Formule (pas une page de réglages globale séparée — la Curation est une propriété d'une Formule précise, pas une configuration partagée comme les Horaires de retrait) qui liste les Composants et propose, pour chacun, une sélection multiple des Variantes de la Carte **par nom lisible**, jamais par ID technique.

## Correspondance des noms (code en anglais, vocabulaire métier français)

`Formule` et `Composant` restent **non traduits** en code, décision explicite plutôt qu'héritée par inadvertance : CONTEXT.md écarte déjà les traductions anglaises naturelles (Menu, bundle, combo, pack — toutes trompeuses ou déjà prises), exactement la situation que l'ADR 0004 a rencontrée avec Créneau. Forcer une traduction produirait un nom moins clair que l'original.

| Domaine (FR) | Code (EN) | Remarque |
| --- | --- | --- |
| module `formule` | module `formule` | non traduit, voir ci-dessus |
| Formule | `Formule` (modèle) | une ligne par Produit Formule |
| Composant | `FormuleComposant` (modèle) | `formule_product_id`, `key`, `label`, `rank` |
| — clé technique du slot | `key` | **anglais**, ex. `"starter"`, `"main"` — c'est un identifiant de code au sens d'AGENTS.md, il finit dans une clé de `line_item.metadata` ; immuable après création (une commande passée y fait référence) |
| — nom affiché du slot | `label` | libre, langue de la carte (« Entrée ») ; pas immuable |
| Curation | Module Link `FormuleComposant` ↔ `ProductVariant` | many-to-many, `isList` des deux côtés, aucune colonne de prix |

## Acceptance criteria

- [ ] Les modèles `Formule` et `FormuleComposant` existent avec leur migration
- [ ] Le Module Link entre `FormuleComposant` et `ProductVariant` existe et supporte le many-to-many (une Variante peut être curée dans plusieurs Composants, un Composant peut curer plusieurs Variantes)
- [ ] Aucune colonne de prix, de montant ou d'ajustement n'existe sur le modèle `Formule`, `FormuleComposant` ni sur la table de lien
- [ ] `key` est immuable après création (pas de route de modification une fois le Composant créé)
- [ ] Routes admin : créer/lister/modifier les Composants d'une Formule ; associer/dissocier des Variantes à un Composant
- [ ] Widget admin sur la fiche du Produit Formule listant ses Composants (par `label`) et, pour chacun, ses Variantes curées, affichées et sélectionnables **par nom de Variante**, jamais par ID
- [ ] Vérification à la main dans l'admin (dev server) — pas de test HTTP automatisé pour ce CRUD, même précédent que le module `pickup`
