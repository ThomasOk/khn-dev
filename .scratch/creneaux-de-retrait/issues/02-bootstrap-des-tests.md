# 02 — Bootstrap des tests : `pnpm test` exécute réellement des tests

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « Testing Decisions » et § « Le monorepo »

**Status:** ready-for-agent

**Blocked by:** Aucun — peut démarrer immédiatement.

## What to build

Aujourd'hui `pnpm test` à la racine ne lance **rien, en silence**, et personne ne le sait : `turbo.json` déclare une tâche `test` et la racine expose `"test": "turbo test"`, mais le backend ne définit que `test:unit`, `test:integration:http` et `test:integration:modules` — jamais `test`. Turbo ne trouve donc aucun script à exécuter et sort vert. C'est une CI verte qui ne prouve rien.

Après ce ticket, `pnpm test` exécute réellement l'unitaire et l'intégration HTTP, et un test fumigène prouve que le runner d'intégration démarre bien une vraie base Postgres. **Il n'existe aucun test dans ce repo aujourd'hui** : ce ticket produit les tout premiers, et les conventions qu'il pose deviennent le prior art de tout le reste du projet. Raison de plus pour ne pas le bâcler, et raison pour laquelle il ne doit pas être dilué dans un ticket fonctionnel.

L'infra est à 90 % en place — elle n'a simplement jamais été branchée. Les trois scripts `test:*` sont déjà conformes à la doc Medusa ; le `jest.config.js` du backend est celui du starter et **réclame déjà** un `integration-tests/setup.js` qui n'existe pas.

## Les deux pièges vérifiés dans la source installée (2.16)

Ils font échouer le premier run, et ils ne se devinent pas :

- **`medusaIntegrationTestRunner` ignore `DATABASE_URL`.** Il reconstruit son URL de connexion depuis `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` et `DB_PORT` — le `.env` actuel, qui ne porte que `DATABASE_URL`, ne suffit donc pas. Il faut un **`.env.test`** fournissant ces variables séparées. Le mot de passe Postgres se lit dans le `.env` du backend : **ne jamais le recopier dans un document ni dans un commit**, et vérifier que `.env.test` est bien ignoré par git avant de committer quoi que ce soit.
- **Le runner crée puis détruit une vraie base Postgres par fichier de test.** L'utilisateur Postgres doit donc avoir le droit de créer des bases. Vérifié sur cette machine : `medusa_user` a bien `rolcreatedb` — **rien à changer côté Postgres**.

Le contenu de `integration-tests/setup.js` est officiel et tient en deux lignes : importer `MetadataStorage` depuis `@medusajs/framework/mikro-orm/core` (chemin valable depuis la 2.11, vérifié présent en 2.16) et appeler `MetadataStorage.clear()`.

## Acceptance criteria

- [ ] `integration-tests/setup.js` existe et appelle `MetadataStorage.clear()` — le `jest.config.js` du starter le réclamait déjà
- [ ] Un `.env.test` fournit `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` et `DB_PORT` séparément, et il est ignoré par git (aucun secret ne part dans un commit)
- [ ] Le backend expose un script `test` qui enchaîne l'unitaire et l'intégration HTTP
- [ ] `pnpm test` depuis la racine exécute ces tests et rapporte le nombre de tests passés — il n'est plus possible de croire à un vert qui ne lance rien
- [ ] Un test HTTP fumigène passe et démontre que le runner démarre bien une vraie base Postgres jetable (c'est lui qui attrape le piège `DATABASE_URL`)
- [ ] Un test unitaire fumigène passe sous `TEST_TYPE=unit`
