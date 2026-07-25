# 04 — Le corps et le lien

**What to build:** Ce que l'accroche ne peut pas dire. Quand une phrase ne suffit pas, le restaurateur ajoute un **corps** de longueur libre et un **lien**, et le client qui veut en savoir plus l'ouvre sur la page où il se trouve — sans naviguer, sans perdre son panier.

La bannière devient cliquable **si et seulement si** il y a quelque chose à ouvrir. Sinon elle reste inerte et n'affiche aucune affordance : on ne laisse pas croire qu'il y a plus à lire quand il n'y a rien. Un seul comportement à comprendre — la bannière **ne navigue jamais**, elle ouvre le panneau ou rien.

Le corps n'a **pas d'adresse** : pas de page, pas d'URL, pas d'indexation. Un message destiné aux réseaux sociaux est réécrit pour eux, c'est décidé.

Ticket volontairement vertical de bout en bout : les trois colonnes, leur validation, le contrat, les champs du formulaire admin et le rendu client arrivent ensemble. C'est une deuxième migration après celle de 01, et c'est le prix pour que cette tranche soit complète plutôt que de brancher une UI sur des colonnes qui traînaient.

**Blocked by:** 03 — L'écran de réglages admin.

**Status:** done

- [x] Ajout de `body`, `link_label` et `link_url` au modèle, avec leur migration
- [x] `body` : trimmé, nullable, **aucun plafond de longueur** — c'est l'accroche qui est contrainte, pas lui
- [x] `link_label` et `link_url` : **les deux présents ou les deux absents**, jamais un seul. Un lien sans libellé n'est pas rendable, un libellé sans lien est un bouton mort
- [x] `link_url` : soit un chemin interne commençant par `/`, soit une URL absolue `http(s)://`. Rien d'autre
- [x] Les trois champs sont ajoutés au contrat de `GET /store/announcement`
- [x] Champs correspondants dans le formulaire admin, corps et lien tous deux facultatifs
- [x] La bannière est cliquable **si et seulement si** `body` ou `link_url` est présent ; sinon aucune affordance
- [x] La bannière ne navigue jamais — elle ouvre le panneau, point
- [x] Le panneau réutilise la primitive modale existante du storefront : rien de nouveau à écrire pour le focus trap, Échap et la restitution du focus au déclencheur
- [x] Le corps est rendu en **texte brut**, sauts de paragraphe préservés. Jamais de `dangerouslySetInnerHTML`
- [x] Le lien est rendu en bouton : chemin interne via `LocalizedClientLink`, URL absolue via une ancre avec `target="_blank"` et `rel="noopener noreferrer"`
- [x] Fermer le panneau rend la page intacte, panier compris
- [x] Test d'intégration HTTP : `link_url` sans `link_label` refusé, et `link_label` sans `link_url` refusé
- [x] Test d'intégration HTTP : `link_url` ni relatif ni `http(s)` refusé
- [x] Test d'intégration HTTP : une Annonce sans corps ni lien reste valide — c'est le cas courant
- [x] Test d'intégration HTTP : corps et lien sont servis par la route store quand ils sont présents
