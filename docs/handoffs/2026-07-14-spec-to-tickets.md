# Handoff — spec créneaux écrit et en PR, next: tickets

*2026-07-14*

## Where things stand

- Branche **`docs/creneaux-spec`** poussée, **[PR #5](https://github.com/ThomasOk/khn-dev/pull/5)** ouverte et **en attente de merge par l'utilisateur** (je n'ai jamais le droit de merger — j'ouvre, il merge).
- `main` est resté à `6238a9f`. Un seul commit sur la branche : `1e4b253`.
- Livrable de la session : **`docs/specs/creneaux-de-retrait.md`** (`Status: ready-for-agent`) — premier contenu de `docs/specs/`.
- Attention : le handoff précédent (`docs/handoffs/2026-07-14-creneaux-research-to-spec.md`), qui traînait non suivi, a été **balayé dans le commit du spec** et fait donc partie de la PR #5. Sans conséquence, mais à savoir en relisant le diff.

## Ce qui s'est passé

`/to-spec` a converti l'ADR 0004 + l'ADR 0003 + la recherche Medusa en un spec pour le slice **Créneaux de retrait**. **Ne relis pas les décisions ici — elles sont toutes dans le spec**, y compris les quatre questions que la recherche laissait ouvertes (fuseau horaire, granularité des clés, UX du créneau expiré, déclencheur de migration vers la capacité), qui sont désormais tranchées et écrites.

Périmètre validé par l'utilisateur : module `creneaux` + page de réglages admin + route `/store/creneaux` + choix du créneau **dans** l'étape de retrait + hook `validate` + widget commande + set de retrait dans le seed.

## Ce que la session a découvert et qui ne vit dans aucun artefact

Deux constats vérifiés dans la source installée (2.16) — ils sont dans le spec, mais méritent d'être relus **avant** d'écrire la moindre ligne de test, parce qu'ils font échouer le premier run :

- `medusaIntegrationTestRunner` **ignore `DATABASE_URL`** ; il reconstruit son URL depuis `DB_HOST` / `DB_USERNAME` / `DB_PASSWORD` / `DB_PORT` et **crée puis détruit une vraie base Postgres par fichier de test**. Il faut donc un `.env.test` (le `.env` actuel ne suffit pas). Le mot de passe Postgres est dans `apps/backend/.env` — le lire là, ne jamais le recopier dans un doc ou un commit.
- `medusa_user` a bien `rolcreatedb` (vérifié sur cette machine) : **rien à changer côté Postgres**.
- Il n'existe **aucun test dans le repo** aujourd'hui. Cette feature produira les premiers. `apps/backend/jest.config.js` réclame déjà un `integration-tests/setup.js` qui n'existe pas.

Et un fait qui change la façon de faire les tickets :

- **`.scratch/` n'est PAS gitignoré.** Les tickets produits par `/to-tickets` seront donc versionnés et feront partie d'une PR. Ce n'est pas un scratchpad jetable dans ce repo.

## What's next

1. **Attendre le merge de la PR #5 par l'utilisateur**, puis repartir d'un `main` à jour.
2. **`/to-tickets`** sur une **nouvelle branche** (le spec et sa décomposition sont volontairement séparés : la revue du spec doit arriver avant sa décomposition, pas après). Les tickets vont dans `.scratch/creneaux-de-retrait/issues/`, un fichier par ticket, numérotés depuis `01`, avec une ligne `Status:` — voir `docs/agents/issue-tracker.md`.
3. Puis `/tdd` ou `/implement`, puis `/code-review`.

Deux contraintes d'ordonnancement à respecter dans la découpe des tickets :

- **Le set de retrait dans le seed (`type: "pickup"`) est un prérequis bloquant.** Sans option de retrait, l'étape de checkout n'a aucune surface et rien du reste n'est démontrable. Il doit être le premier ticket.
- **Le bootstrap des tests** (`integration-tests/setup.js`, `.env.test`, le script `test` manquant du backend) conditionne tous les tickets testés. À sortir tôt, et à ne pas diluer dans un ticket fonctionnel.

## Good to know

- **`/to-spec`, `/to-tickets`, `/handoff`, `/grilling`, `/domain-modeling` ont `disable-model-invocation: true`** — je ne peux pas les lancer de ma propre initiative, l'utilisateur **doit les taper**. Le lui rappeler plutôt que d'essayer de contourner.
- Workflow git : branche → PR → **l'utilisateur merge**. `gh` est installé et authentifié (`ThomasOk`).
- **Ne jamais ajouter de trailer `Co-Authored-By: Claude`** aux commits ou PR de ce repo.
- `AGENTS.md` impose de **vérifier la version installée avant de proposer une API Medusa** — pas de mémoire d'entraînement. C'est exactement ce qui a fait apparaître le piège `DATABASE_URL` cette session ; ça vaut le coup de continuer.
- Les docs du repo sont en anglais (CONTEXT.md, ADR) mais la recherche et le spec sont en français. L'utilisateur échange en français.

## Suggested skills for next session

- **`/to-tickets`** (primaire, après le merge de la PR #5) — décomposer `docs/specs/creneaux-de-retrait.md` en tickets dans `.scratch/creneaux-de-retrait/issues/`. À taper par l'utilisateur.
- `/tdd` — le spec fixe deux seams (intégration HTTP + unitaire pur sur la dérivation à horloge injectée) ; ils sont faits pour être attaqués test-first, et la dérivation en particulier n'a de sens qu'écrite ainsi.
- `/verify` — avant de commiter l'implémentation : piloter réellement le tunnel de commande, pas seulement faire passer les tests.
- `domain-modeling` — seulement si un terme neuf émerge. À ce stade il n'y en a pas : la « durée d'un créneau » a été explicitement classée comme un champ de configuration, pas comme un concept du domaine.
