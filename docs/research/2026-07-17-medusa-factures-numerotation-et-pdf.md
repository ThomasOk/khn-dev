# Medusa 2.16 : la Facture — numérotation séquentielle sans trou et PDF immuable

**Date** : 2026-07-17
**Versions vérifiées** : Medusa **2.16.0** (`apps/backend/package.json`, tous les `@medusajs/*` épinglés à `2.16.0`), `pdfmake` **^0.3.11**, PostgreSQL (version du serveur non fixée par le repo).
**Statut** : recherche — aucune décision prise. Les sections « Recommandation » sont écrites pour être converties en ADR (compléments à l'ADR 0002).

> Cette note prolonge deux décisions déjà prises : **ADR 0002** (`docs/adr/0002-factures-issued-frozen.md`) — la Facture est *issued & frozen*, compteur dédié, `pdfmake`, et **rejet explicite du cycle de vie du tutoriel Medusa** — et la recherche du 2026-07-16 (`docs/research/2026-07-16-medusa-notification-commande-ticket-cuisine.md`) qui a vérifié `pdfmake@0.3.11` par exécution et posé le seam de rendu réutilisable `apps/backend/src/lib/pdf/render.ts`. Elle ne les répète pas ; elle traite les deux inconnues que l'ADR laisse ouvertes : **(1) comment allouer un numéro séquentiel sans trou sous concurrence** et **(2) comment structurer le module `invoice` et figer son PDF**.

## Convention de citation

Les paquets Medusa sont résolus par pnpm à la **racine du monorepo** (`node_modules/.pnpm/@medusajs+<pkg>@2.16.0_<hash>/node_modules/@medusajs/<pkg>/`), pas sous `apps/backend`. Pour la lisibilité, les citations sont notées **`@medusajs/<pkg> → dist/chemin.js:ligne`**. Les paquets ne publient que du `dist` compilé. Les chemins du repo sont donnés tels quels. Tout ce qui est affirmé sans citation est soit une évidence, soit **signalé comme non vérifié**, soit **explicitement noté comme principe Postgres/BD général** ou **recommandation**.

---

## TL;DR

1. **Le numéro de facture ne peut pas venir d'une `SEQUENCE`/`SERIAL`/`model.autoincrement()`.** Postgres ne « rembobine » jamais un `nextval` : un rollback ou un crash **laisse un trou** — *« the value obtained by `nextval` is not reclaimed for re-use if the calling transaction later aborts […] can result in gaps »* ([doc Postgres](https://www.postgresql.org/docs/current/functions-sequence.html)). C'est précisément ce que `model.autoincrement()` fait sous le capot, et c'est ce que le tutoriel Medusa utilise (`display_id: model.autoincrement()`). **Le tutoriel est donc non conforme à l'ADR 0002 sur la numérotation, pas seulement sur le cycle de vie.**

2. **La bonne primitive est une ligne compteur dédiée, incrémentée par `UPDATE … RETURNING` dans la *même* transaction que l'insertion de la Facture.** Le verrou de ligne Postgres sérialise les allocations concurrentes ; comme le numéro et l'enregistrement sont validés (ou annulés) ensemble, **aucun crash ne peut brûler un numéro**. C'est du verrouillage Postgres natif, indépendant du nombre d'instances.

3. **Medusa 2.16 fournit bien un Locking Module** (`ILockingModule.execute/acquire/release`), mais **son provider par défaut est *in-memory*, mono-instance** — *« not recommended for production […] single-instance environment »*. Le provider Postgres (`@medusajs/locking-postgres`) utilise `pg_advisory_xact_lock`. Le Locking Module est un **complément applicatif optionnel**, pas la source de la garantie *gapless* : celle-ci vient de l'atomicité SQL du point 2.

4. **La tension *gapless* vs compensation de workflow se résout en rendant l'émission terminale, pas compensable.** Un workflow Medusa n'est **pas** une seule transaction ACID : chaque step commit indépendamment et se défait par compensation. Or **compenser une allocation de numéro rouvrirait un trou**. La parade : allouer le numéro **en dernier**, une fois le paiement capturé et irréversible (commandes pré-payées, même jour — CONTEXT.md), dans un unique appel de service atomique, **idempotent sur `order_id`**. Rien après le numéro ne peut échouer et forcer un rollback du numéro.

5. **Point d'insertion : un subscriber sur `payment.captured`**, symétrique du `kitchen-ticket-notification` existant, déclenchant un `issueInvoiceWorkflow`. `capturePaymentWorkflow` émet `PaymentEvents.CAPTURED = "payment.captured"` — et le repo capture déjà automatiquement à `order.placed` (`auto-capture-payment.ts`). L'idempotence (contrainte `unique(order_id)`) absorbe les rejeux d'événement.

6. **Module `invoice` : data model (champs gelés + numéro + référence fichier) + service + lien vers Order.** Le PDF est rendu **une fois** par le `pdfmake` déjà en place (`renderPdfDocDefinitionToBase64`, `render.ts`) depuis les champs gelés, **ses octets** sont stockés via le **File Module** (`createFiles`, base64, `access: "private"`), et la référence fichier est posée sur l'enregistrement. **On ne stocke pas le `docDefinition` régénérable** (ce que fait le tutoriel) : ce serait rendre l'immuable régénérable.

---

## 1. La numérotation séquentielle sans trou sous concurrence

### 1.1 Pourquoi `SEQUENCE` / `SERIAL` / `model.autoincrement()` est disqualifié

Le besoin (CONTEXT.md § *Numéro de facture*, ADR 0002) : *« un compteur dédié — chronologique, sans trou. Pas le `display_id` de Medusa, pas l'id de commande, pas un UUID. Les trous sont ce qu'un contrôle cherche. »*

Une `SEQUENCE` Postgres (et donc `SERIAL`, `BIGSERIAL`, `GENERATED … AS IDENTITY`, et le `model.autoincrement()` de Medusa qui s'appuie dessus) **ne peut structurellement pas être *gapless*** :

> *« To avoid blocking concurrent transactions that obtain numbers from the same sequence, the value obtained by `nextval` is not reclaimed for re-use if the calling transaction later aborts. This means that transaction aborts or database crashes can result in gaps in the sequence of assigned values. »*
> — [PostgreSQL, *Sequence Manipulation Functions*](https://www.postgresql.org/docs/current/functions-sequence.html) **(principe Postgres général, cité)**

Autrement dit, le trou est une **propriété voulue** des séquences : elles échangent l'absence de trou contre l'absence de contention. Deux transactions qui prennent `nextval` en parallèle obtiennent `41` et `42` ; si celle qui a `41` échoue, `41` est **perdu à jamais**, et la Facture suivante sera `43`. Un contrôle fiscal lit un saut `40 → 42 → 43` et demande où est passée la facture `41`.

**Le tutoriel Medusa tombe dans ce piège.** Son modèle utilise `display_id: model.autoincrement()` et formate `INV-{display_id}` (vérifié sur [docs.medusajs.com/resources/how-to-tutorials/tutorials/invoice-generator](https://docs.medusajs.com/resources/how-to-tutorials/tutorials/invoice-generator)). L'ADR 0002 disait déjà *« verify its numbering against the gapless-counter requirement »* — **voici la vérification : elle échoue.** Le `display_id` autoincrement du tutoriel est aussi peu *gapless* que le `display_id` natif de la commande que CONTEXT.md interdit déjà d'utiliser.

### 1.2 Le Locking Module de Medusa 2.16 : il existe, mais son défaut est mono-instance

Medusa 2.16 **fournit** un module de verrouillage. L'interface (`@medusajs/types → dist/locking/index.d.ts`) :

```ts
export interface ILockingModule {
  execute<T>(keys: string | string[], job: () => Promise<T>,
             args?: { timeout?: number; provider?: string }, sharedContext?: Context): Promise<T>
  acquire(keys: string | string[],
          args?: { ownerId?: string | null; expire?: number; provider?: string }, sharedContext?: Context): Promise<void>
  release(keys: string | string[],
          args?: { ownerId?: string | null; provider?: string }, sharedContext?: Context): Promise<boolean>
  releaseAll(args?: { ownerId?: string | null; provider?: string }, sharedContext?: Context): Promise<void>
}
```

On le résout par `container.resolve(Modules.LOCKING)` (`Modules.LOCKING = "locking"`, mappé sur `"@medusajs/medusa/locking"` — `@medusajs/utils → dist/modules-sdk/definition.js:31,64`).

**Le piège, et il est majeur : le provider par défaut est *in-memory*.** Le loader du module enregistre `InMemoryLockingProvider` comme provider par défaut (`@medusajs/locking → dist/loaders/providers.js:26-33`, `LockingDefaultProvider = "default_provider"` → identifier in-memory), et ce provider *« uses a plain JavaScript map to store the locks »* et est *« not recommended for production environments as it is only intended for use in a single-instance environment »* ([docs.medusajs.com/resources/infrastructure-modules/locking](https://docs.medusajs.com/resources/infrastructure-modules/locking)). Le code confirme : `this.locks = new Map()` (`@medusajs/locking → dist/providers/in-memory.js`).

**Conséquence :** un verrou *in-memory* protège contre la concurrence **entre requêtes d'un même process**, pas entre plusieurs instances/worker du backend. Le jour où le déploiement scale à deux conteneurs (ou sépare le worker du serveur, ce que Medusa recommande), deux `order.placed` traités en parallèle sur deux instances **ne se voient pas** et peuvent allouer le même numéro. **Un verrou applicatif *in-memory* est donc insuffisant pour une garantie légale.**

Le provider Postgres, lui, est réel et inter-instances. Son `execute` (`@medusajs/locking-postgres → dist/services/advisory-lock.js:15-40`) :

```js
async execute(keys, job, args) {
  return await this.getManager().transactional(async (manager) => {
    const fnName = "pg_advisory_xact_lock"
    const numKeys = (Array.isArray(keys) ? keys : [keys]).map(this.hashStringToInt)
    const lockPromises = numKeys.map((numKey) => manager.execute(`SELECT ${fnName}(?)`, [numKey]))
    await Promise.race([/* timeout */, Promise.all(lockPromises)])
    const ret = await job()   // le job s'exécute DANS la transaction, verrou tenu
    await manager.commit()
    return ret
  })
}
```

Il ouvre une transaction MikroORM, prend un **`pg_advisory_xact_lock`** (clé texte hachée en entier), exécute le job **à l'intérieur** de cette transaction, puis commit. Le verrou est **automatiquement relâché à la fin de la transaction** — *« Transaction-level lock requests […] are automatically released at the end of the transaction, and there is no explicit unlock operation »* ([PostgreSQL, *Advisory Locks*](https://www.postgresql.org/docs/current/explicit-locking.html) **(cité)**). Son identifier est `"locking-postgres"` (`advisory-lock.js:124`). `acquire`/`release`, eux, utilisent une table `locking` persistante avec `owner_id`/`expiration` (`advisory-lock.js:42,55`) — sémantique de bail, hors sujet ici.

### 1.3 Les options Postgres, comparées

Trois façons de sérialiser l'allocation. Les trois marchent ; elles ne se valent pas.

| Option | Comment | Inter-instances ? | *Gapless* garanti ? | Coût / dépendance |
|---|---|---|---|---|
| **A. Ligne compteur + `UPDATE … RETURNING`** dans la même transaction que l'insert Facture | `UPDATE invoice_counter SET value = value + 1 WHERE id = 'facture' RETURNING value`, puis `INSERT` de la Facture avec ce numéro, **un seul commit** | ✅ (verrou de ligne Postgres) | ✅ si et seulement si numéro et Facture sont dans **la même transaction** | Aucune. Postgres natif. |
| **B. `SELECT … FOR UPDATE`** sur la ligne compteur, puis `UPDATE` | Verrouille la ligne — *« prevents them from being locked, modified or deleted by other transactions until the current transaction ends »* ([doc](https://www.postgresql.org/docs/current/explicit-locking.html)) | ✅ | ✅ (même condition que A) | Aucune. Équivalent à A en deux requêtes. |
| **C. `pg_advisory_xact_lock`** via `lockingModule.execute(["invoice:number"], job)` **avec provider Postgres** | Verrou applicatif nommé, relâché au commit | ✅ **seulement si** `locking-postgres` est configuré (défaut = in-memory ❌) | ✅ *si* l'insert Facture est dans la **même** transaction que le job | Configuration `medusa-config` du provider ; nuance d'atomicité (voir ci-dessous). |
| ~~D. `SEQUENCE`/`SERIAL`/`autoincrement`~~ | `nextval` | — | ❌ **jamais** (§1.1) | Disqualifié. |

**A et B sont la même idée** (verrou de ligne sur un compteur), B étant A explicité en deux temps. **La garantie *gapless* de A/B tient à une condition non négociable : le `+1` du compteur et l'`INSERT` de la Facture doivent partager la même transaction.** Si on incrémente le compteur, on commit, puis on insère la Facture dans une seconde transaction, un crash entre les deux **brûle un numéro** — exactement le trou qu'on refuse. Un compteur `gapless` n'est *gapless* que rendu atomique avec la ligne qui le consomme.

**C a une subtilité d'atomicité** que A/B n'ont pas. `lockingModule.execute` ouvre **sa** transaction et y exécute le job. Pour que l'insert Facture soit couvert par le même verrou et le même commit, il faut soit propager le `sharedContext`/transaction de la locking-provider jusqu'au service `invoice` (non trivial, non vérifié dans cette session), soit accepter que le verrou advisory ne fasse que *sérialiser* pendant que l'atomicité réelle vient encore d'un `UPDATE … RETURNING` dans le job. **Autrement dit, C sans A/B à l'intérieur ne suffit pas ; A/B sans C suffisent.** C n'apporte que si l'on veut un point de sérialisation nommé et lisible — au prix de configurer `locking-postgres` et de ne pas se tromper sur la propagation de transaction.

### 1.4 La tension *gapless* vs compensation de workflow

C'est le point conceptuel dur, et l'endroit où l'implémentation naïve casse.

**Un workflow Medusa n'est pas une transaction ACID unique.** Chaque step est validé indépendamment et se **défait par une fonction de compensation** en cas d'échec d'un step ultérieur (skill `building-with-medusa`, `reference/workflows.md` : *« Add compensation function to steps for rollback »* ; c'est le modèle saga, pas le modèle transaction). Le repo l'illustre : `set-composant-variants.ts`, `manage-*.ts` composent des steps compensables.

Posons le piège explicitement. Supposons un `issueInvoiceWorkflow` en trois steps :

1. `allocateInvoiceNumberStep` → alloue `42`, compensation : « rendre `42` ».
2. `renderInvoicePdfStep` → génère le PDF.
3. `storeInvoiceFileStep` → stocke les octets.

Si le step 3 échoue, la saga compense le step 1 : elle « rend » `42`. Mais entre-temps une **autre** commande a pu allouer `43`. On se retrouve avec `43` émise et `42` annulée : **le trou est de retour.** Pire, si la compensation supprime la ligne `42`, on a `41, 43` en base — le trou visible qu'on refuse. **Rendre l'allocation compensable réintroduit exactement le problème que le compteur *gapless* devait résoudre.**

**La résolution : ne pas rendre l'émission compensable. La rendre terminale et idempotente.**

Le domaine l'autorise, et c'est écrit noir sur blanc. CONTEXT.md § *Facture — issued and frozen* et ADR 0002 : *« Orders are same-day and pre-paid, so nothing can legitimately change after payment anyway — freezing costs nothing. »* Au moment où le paiement est **capturé**, la commande est définitive : il n'y a plus rien après qui puisse échouer légitimement. Donc :

- **On émet la Facture une fois le paiement capturé** (§1.5), pas avant. Le numéro n'est jamais alloué « en spéculation » sur un paiement qui pourrait échouer.
- **L'allocation du numéro + l'insertion de l'enregistrement Facture (champs gelés) se font dans UN seul appel de service atomique** (option A/B), qui commit ou rollback en bloc. Pas de step compensable autour du numéro.
- **Tout ce qui suit le numéro est *retriable*, jamais compensable** : la génération du PDF et le stockage du fichier n'annulent pas le numéro. S'ils échouent, on rejoue ; l'enregistrement (numéro + champs) existe déjà, il lui manque juste sa référence fichier, qu'un rejeu pose. Le PDF étant une **fonction pure des champs gelés**, le régénérer à l'identique n'est pas une « régénération » interdite par l'ADR (l'ADR interdit de régénérer *pour corriger* un document émis, pas de matérialiser une première fois des octets déterministes à partir de données figées).
- **Idempotence sur `order_id`** : une contrainte `unique(order_id)` sur le modèle Facture fait qu'un rejeu de l'émission (événement redélivré, worker relancé) **ne peut pas** créer une seconde Facture ni consommer un second numéro. La seconde tentative voit la Facture existante et s'arrête (ou complète juste le fichier manquant).

En résumé de la tension : **on n'essaie pas de rendre un numéro *gapless* réversible — on le rend irréversible et on s'arrange pour qu'aucune étape réversible ne le suive.** Le trou ne réapparaît pas parce qu'il n'y a pas de compensation qui puisse le rouvrir.

> Corollaire architectural à retenir : **l'allocation atomique doit vivre dans une méthode du service `invoice` (une transaction), invoquée par un step — pas être éclatée sur plusieurs steps.** « Faire tourner ça dans un step de workflow avec de bonnes bornes de transaction » (la question posée) se répond ainsi : le step délègue à une méthode transactionnelle du module ; c'est cette méthode, pas le workflow, qui porte la transaction. Le workflow n'apporte que l'orchestration (idempotence, retry, enchaînement PDF→fichier) autour d'un cœur atomique non compensable.

### 1.5 Où brancher l'allocation : `payment.captured`, en subscriber

`capturePaymentWorkflow` émet, après capture, `PaymentEvents.CAPTURED` (`@medusajs/core-flows → dist/payment/workflows/capture-payment.js:53-55`), dont la valeur est `"payment.captured"` (`@medusajs/utils → dist/core-flows/events.js:927`). Ce workflow **n'expose aucun hook** (`capture-payment.js` n'a pas de `.hooks.*`) — un hook de workflow est donc exclu pour capturePaymentWorkflow ; le point d'accroche est **l'événement**.

Le repo capture déjà **automatiquement** le paiement à la commande : `auto-capture-payment.ts` écoute `order.placed` et lance `capturePaymentWorkflow` pour chaque paiement non capturé. La chaîne réelle est donc : `order.placed` → (subscriber) `capturePaymentWorkflow` → `payment.captured`.

**Deux points d'insertion possibles, recommandation : `payment.captured`.**

- **`payment.captured`** colle à la lettre de CONTEXT.md/ADR 0002 (*« issued when the payment is taken »*). C'est l'instant exact où l'argent est pris et où la Facture devient légitime. Un subscriber `invoice-issue.ts` sur cet événement, symétrique du `kitchen-ticket-notification.ts` existant, lance `issueInvoiceWorkflow`.
- **`order.placed`** est tentant (le repo y a déjà deux subscribers) mais **prématuré** : à `order.placed`, l'auto-capture n'a pas encore forcément confirmé la capture. Émettre la Facture avant la capture, c'est risquer une Facture sans paiement pris — précisément ce que « issued when payment is taken » interdit.

Le subscriber suit la discipline maison, déjà éprouvée (`kitchen-ticket-notification.ts:*`, `order-confirmation.ts:113-115`) : `try/catch`, `logger.error`, **jamais de `throw`** qui referait échouer la capture. Nuance importante par rapport au Ticket cuisine, dont l'échec est bénin : **une Facture qui ne s'émet pas est un manquement légal, pas une commodité manquée.** L'idempotence sur `order_id` permet donc d'être agressif sur le rejeu — un job planifié ou une route admin de secours peut re-déclencher `issueInvoiceWorkflow` pour toute commande capturée sans Facture, sans risque de doublon ni de trou. (Voir Questions ouvertes.)

---

## 2. Le module `invoice` et le PDF immuable

### 2.1 Forme du module

Un module custom `invoice` classique (même moule que `pickup`, `formule` — `apps/backend/src/modules/*/index.ts` + `service.ts` + `models/`), nom **camelCase** (`type-module-name-camelcase`).

**Data model `invoice`** — porte le numéro, les champs **gelés**, et la référence fichier. « Gelés » veut dire : copiés au moment de l'émission, jamais relus depuis la commande ensuite (l'adresse de facturation, les lignes, la TVA de la commande peuvent techniquement bouger ; la Facture, non).

```ts
// esquisse — models/invoice.ts
const Invoice = model.define("invoice", {
  id: model.id({ prefix: "inv" }).primaryKey(),
  // Le numéro séquentiel sans trou (§1). PAS un autoincrement.
  number: model.number().unique(),
  // Chaîne d'affichage figée à l'émission, ex. "F-2026-000042" (le format
  // est une décision ouverte, cf. §4).
  formatted_number: model.text().unique(),
  // Idempotence + lien logique. Une seule Facture par Commande.
  order_id: model.text().unique(),
  issued_at: model.dateTime(),
  // Champs gelés : tout ce que la Facture doit montrer, recopié, jamais relu.
  // (adresse de facturation, lignes + prix + TVA, totaux, coordonnées client…)
  frozen_data: model.json(),
  // Référence vers les octets stockés par le File Module (§2.3). Nullable :
  // l'enregistrement (numéro compris) est committé AVANT que le PDF existe,
  // pour que le PDF soit retriable sans toucher au numéro (§1.4).
  file_id: model.text().nullable(),
  file_url: model.text().nullable(),
})
```

Un second modèle **`invoice_counter`** (une seule ligne, `id = "facture"`, `value: number`) porte le compteur (§1.3 option A/B). Le tenir dans **ce** module garde toute la logique de numérotation au même endroit et évite qu'un autre module touche au compteur.

**Service** : `MedusaService({ Invoice, InvoiceCounter })`, plus **une** méthode métier transactionnelle `issueInvoice(order_id, frozenData)` qui, dans une seule transaction : `UPDATE invoice_counter … RETURNING value`, puis `INSERT` de la Facture avec ce numéro — et qui, en cas de `order_id` déjà présent (contrainte unique), retourne la Facture existante au lieu d'en créer une seconde (idempotence, §1.4). C'est le seul endroit où l'atomicité *gapless* vit. Le reste du service reste du CRUD (`logic-module-service`).

> Point d'implémentation à vérifier : la façon d'exécuter les deux requêtes dans **une** transaction depuis un `MedusaService`. Medusa expose `@InjectManager` / `@InjectTransactionManager` et un `sharedContext` transactionnel sur les méthodes de service ; l'`UPDATE … RETURNING` peut passer par le manager MikroORM (`this.<...>Service_` / `manager.execute(sql)`). L'ossature exacte (décorateurs, accès au manager) est à confirmer contre la doc 2.16 au moment d'implémenter — **non vérifié par exécution dans cette session.** Le principe (une transaction, deux écritures, un commit) ne dépend pas de ce détail.

### 2.2 Le PDF : réutiliser le `pdfmake` déjà en place

Rien de neuf à installer : le seam de rendu existe et est vérifié. `apps/backend/src/lib/pdf/render.ts` expose `renderPdfDocDefinitionToBase64(docDefinition)` — il enregistre les fonts Roboto une fois par process via le **singleton** `pdfmake@0.3.x` (`pdfmake.addFonts(...)`, `render.ts:20-27`), puis `pdfmake.createPdf(docDefinition).getBuffer()` → `buffer.toString("base64")` (`render.ts:39-41`). C'est exactement le contrat que l'ADR 0002 §6.4 impose (API singleton 0.3.x, pas `new PdfPrinter` de 0.2). Le commentaire de `render.ts:31-35` anticipe déjà la Facture : *« The single piece shared between the Facture and the Ticket cuisine […] Knows nothing about what a ticket or a facture contains. »*

Le Ticket cuisine donne le patron à copier : un builder **pur** `buildKitchenTicketDocDefinition(order): PdfMakeDocDefinition` (`apps/backend/src/lib/pdf/kitchen-ticket.ts:91`) — objet-shaped in, `docDefinition` out, aucune DB/réseau/container — testé au seam par `kitchen-ticket.unit.spec.ts` (rendu → buffer → assertions sur `/MediaBox`, `/Pages /Count`, texte extrait). La Facture aura son **propre** builder `buildInvoiceDocDefinition(frozenData): PdfMakeDocDefinition` dans `apps/backend/src/lib/pdf/invoice.ts`, avec son test unitaire jumeau. CONTEXT.md § *Facture* l'exige : *« pas deux rendus d'un même template »* — **templates séparés, moteur (`render.ts`) commun**, exactement la distinction posée par la recherche du 2026-07-16 §6.1. Contrairement au ticket (80 mm, sans prix), la Facture est A4, porte prix/TVA/adresse de facturation, et n'a aucune contrainte de largeur d'imprimante thermique.

> Déterminisme : `pdfmake` incruste dans le PDF une date de création (`/CreationDate`) et un id — deux rendus des mêmes données ne sont donc pas *byte-identical*. **Ça n'est pas un problème ici**, parce qu'on ne compare jamais deux rendus : on rend **une fois**, on stocke les octets, et l'immuabilité porte sur *ces* octets stockés (§2.3), pas sur une reproductibilité bit-à-bit. La reproductibilité déterministe de pdfmake est donc **hors sujet** pour ce design — on ne s'appuie pas dessus.

### 2.3 Où stocker les octets : le File Module

Les octets du PDF vont dans le **File Module** de Medusa, pas dans une colonne. `IFileModuleService.createFiles` (`@medusajs/types → dist/file/service.d.ts:35,50`) accepte un `CreateFileDTO` :

```ts
// @medusajs/types → dist/file/mutations.d.ts
export interface CreateFileDTO {
  filename: string
  mimeType: string           // "application/pdf"
  content: string            // "The file content as a base64-encoded string."
  access?: FileAccessPermission  // "Defaults to private if not passed"
}
```

Le `base64` de `renderPdfDocDefinitionToBase64` alimente directement `content`. `access` doit rester **`private`** (défaut) : une Facture n'est pas un fichier public, elle est servie au client via une route authentifiée / un lien signé. `createFiles` retourne un `FileDTO` (id + url) qu'on pose sur `invoice.file_id` / `invoice.file_url`.

> Le provider File **par défaut** de Medusa écrit sur le **disque local** (`@medusajs/file-local`) — acceptable en dev, fragile en prod (éphémère, non partagé entre instances). Un provider S3/Spaces est le choix de prod. **Le repo n'a pas encore de cible de déploiement** (constaté dans la recherche du 2026-07-16 §2.2C : ni Dockerfile, ni `fly.toml`). Le choix du provider File suit ce même arbitrage de déploiement encore ouvert — à trancher avant la mise en prod, pas dans cette recherche. Ce qui compte pour le design : le module `invoice` parle au File Module par **son service**, jamais au disque en direct, donc le provider est interchangeable sans toucher au module.

### 2.4 Le lien Facture ↔ Commande (Module Link), et la référence fichier

Règle du repo (AGENTS.md, `arch-module-isolation`) : **pas d'accès cross-module direct, uniquement des Module Links.** La Facture appartient à une Commande ; le lien va dans `apps/backend/src/links/`, un lien par fichier (`file-links-directory`, et le lien `formule-composant-variant.ts` existant sert de patron) :

```ts
// esquisse — src/links/invoice-order.ts
import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import InvoiceModule from "../modules/invoice"

// Une Facture pour une Commande, une Commande a au plus une Facture : pas
// d'isList — lien un-à-un. (À confirmer : orientation/cardinalité exactes.)
export default defineLink(
  InvoiceModule.linkable.invoice,
  OrderModule.linkable.order
)
```

Après quoi **il faut lancer les migrations de lien** (`npx medusa db:migrate`) — étape que la skill martèle comme non-optionnelle (`module-links.md` Step 3). La Facture se requête alors par `query.graph({ entity: "order", fields: ["invoice.*"] })` sans jamais importer le service `order`.

**Pour le fichier**, deux options, décision ouverte (§4) :
- **(a)** stocker `file_id`/`file_url` en colonnes texte sur `invoice` (comme esquissé §2.1) et résoudre les octets via `container.resolve(Modules.FILE)` quand on sert le PDF. Simple ; le `file_id` est une *référence*, pas un import de service — dans l'esprit de la règle.
- **(b)** un Module Link `invoice ↔ file`. Plus « pur » Medusa, mais plus lourd, et le File Module se prête moins naturellement au lien qu'un modèle métier. **Penchant : (a)**, en gardant le lien *métier* (Facture ↔ Order) explicite et le fichier en simple référence.

### 2.5 Ce que l'immuabilité interdit (rappel ADR 0002, appliqué au design)

Le tutoriel Medusa fait **deux** choses que ce design doit refuser, et l'ADR 0002 en a déjà tranché une :

1. **Cycle de vie `STALE` + régénération** (rejeté par l'ADR 0002) : le tutoriel marque la Facture `stale` sur `order.updated` et **régénère le PDF** à la prochaine demande. Ici : **pas de subscriber `order.updated` sur la Facture**, pas de statut `stale`, pas de régénération. Une Facture émise ne bouge plus ; la correction, si un jour nécessaire, est un **Avoir** manuel (CONTEXT.md § *Avoir*, ADR 0002) — hors périmètre, sans module.
2. **Stocker le `docDefinition` régénérable au lieu des octets** (nouveau constat de cette recherche) : le tutoriel stocke le `pdfContent` (l'objet `docDefinition` de pdfmake) dans un champ JSON et **re-crée le buffer à chaque demande**. C'est structurellement incompatible avec « issued & frozen » : un document dont on garde la *recette* et non le *résultat* est un document qu'un changement de template, de police ou de version de pdfmake **réécrit silencieusement**. On stocke donc **les octets** (§2.3), pas la recette. Le `frozen_data` (§2.1) sert à l'audit et à un éventuel re-render *identique* de secours, jamais à servir le document courant.

---

## 3. Design recommandé (concret)

> **Un module `invoice` (data model Facture + ligne compteur + service à une méthode atomique `issueInvoice`), lié à Order par un Module Link, alimenté par un subscriber sur `payment.captured` qui lance un `issueInvoiceWorkflow` idempotent : allocation *gapless* atomique du numéro, puis rendu `pdfmake` et stockage File Module des octets — le tout non compensable après capture.**

Rédigé pour un ADR (compléments à l'ADR 0002) :

1. **Numérotation.** Une ligne compteur dédiée `invoice_counter`, incrémentée par `UPDATE … RETURNING` (option A) **dans la même transaction** que l'`INSERT` de la Facture, via l'unique méthode `issueInvoice` du service `invoice`. **Interdiction d'`autoincrement`/`SEQUENCE`/`SERIAL`** pour le numéro (§1.1) — y compris le `display_id: model.autoincrement()` du tutoriel. La garantie *gapless* vient de l'atomicité SQL, pas d'un verrou applicatif.

2. **Verrou.** Le verrou de ligne Postgres (`UPDATE`/`FOR UPDATE`) suffit et est inter-instances sans configuration. Le **Locking Module** de Medusa est **optionnel** ; si on l'emploie (`lockingModule.execute(["invoice:number"], …)`), il **faut configurer le provider `@medusajs/locking-postgres`** dans `medusa-config`, car **le défaut in-memory est mono-instance et ne protège pas un déploiement multi-instances** (§1.2). Recommandation : commencer sans le Locking Module (option A pure), l'ajouter seulement si un besoin de sérialisation applicative plus large apparaît.

3. **Émission terminale, non compensable, idempotente.** Déclenchée sur `payment.captured` (§1.5), après capture donc irréversible. Contrainte `unique(order_id)` ⇒ un rejeu ne crée jamais de doublon ni de trou. Le numéro n'est jamais alloué dans un step compensable (§1.4).

4. **PDF.** Builder pur `buildInvoiceDocDefinition(frozen_data)` dans `src/lib/pdf/invoice.ts`, rendu par `renderPdfDocDefinitionToBase64` (`render.ts`, déjà en place), testé au seam comme `kitchen-ticket.unit.spec.ts`. Rendu **une fois**, à partir des champs gelés.

5. **Stockage.** Octets → File Module (`createFiles`, `mimeType: "application/pdf"`, `access: "private"`), `file_id`/`file_url` posés sur l'enregistrement Facture après le commit du numéro (retriable, jamais compensable). Provider File de prod (S3…) à choisir avec la cible de déploiement.

6. **Lien.** Module Link `invoice ↔ order` (`src/links/invoice-order.ts`) + `npx medusa db:migrate`. Aucun import direct du service `order`. Référence fichier en colonnes texte sur la Facture (option (a), §2.4).

7. **Ce qu'on ne construit pas** (ADR 0002) : pas de statut `stale`, pas de subscriber `order.updated`, pas de régénération, pas de stockage du `docDefinition`, pas de module Avoir.

**Séquence à l'exécution :**

```
order.placed
  └─ auto-capture-payment.ts (existant) ── capturePaymentWorkflow ──▶ payment.captured
                                                                          └─ invoice-issue.ts (nouveau, try/catch, no throw)
                                                                               └─ issueInvoiceWorkflow(order_id)
                                                                                    1. loadFrozenOrderDataStep      (query.graph)
                                                                                    2. issueInvoiceStep ───────────▶ service.issueInvoice()
                                                                                         │  [1 TRANSACTION, non compensable]
                                                                                         │  UPDATE invoice_counter +1 RETURNING
                                                                                         │  INSERT invoice (number, frozen_data, order_id UNIQUE)
                                                                                         └─ (idempotent : order_id déjà là ⇒ renvoie l'existant)
                                                                                    3. renderInvoicePdfStep         (buildInvoiceDocDefinition → render.ts)   [retriable]
                                                                                    4. storeInvoiceFileStep         (File Module createFiles → file_id/url)     [retriable]
                                                                                    5. linkInvoiceToOrderStep       (createRemoteLink invoice↔order)
```

---

## 4. Questions ouvertes et non-vérifiés

**Explicitement non vérifié (à confirmer à l'implémentation) :**

- **L'ossature transactionnelle exacte dans un `MedusaService` 2.16** (`@InjectManager`/`@InjectTransactionManager`, accès au manager MikroORM pour un `UPDATE … RETURNING` brut) — §2.1. Lu conceptuellement, pas exécuté dans cette session. Le principe (une transaction, deux écritures) est robuste ; la syntaxe est à caler sur la doc 2.16 / le MCP MedusaDocs (non consultable ici : il exige un OAuth interactif indisponible en agent).
- **La propagation de transaction si l'on passe par `lockingModule.execute`** (option C, §1.3) : que le job et l'insert Facture partagent bien la transaction de la locking-provider. Non vérifié — raison de plus de préférer l'option A pure.
- **Cardinalité/orientation exactes du `defineLink` invoice↔order** (isList, deleteCascade) — §2.4. À décider et migrer.
- **Le comportement de `createFiles` du provider local vs S3** sur un contenu base64 volumineux — sans objet pour une facture de quelques Ko, mais non exécuté.

**À décider (hors périmètre de cette recherche) :**

- **Format du `formatted_number`.** `F-2026-000042` ? `2026-0042` ? Remise à zéro annuelle du compteur (fréquent en compta FR) ou compteur continu à vie ? La remise à zéro annuelle implique un compteur **par année** (clé compteur = l'année) et change la contrainte d'unicité (`unique(number)` → `unique(year, number)`). **Décision comptable, pas technique** — mais elle façonne le modèle.
- **Provider File de production** (S3/Spaces/local) — lié à la cible de déploiement encore non choisie (cf. recherche 2026-07-16 §2.2C).
- **Route de service du PDF au client.** L'email de confirmation client (`order-confirmation.ts`) doit-il porter la Facture en pièce jointe (comme le Ticket cuisine côté restaurateur) ? Ou un lien signé vers le File Module ? Une route admin `GET /admin/orders/:id/invoice` pour réimpression ? Le rendu étant déjà écrit, c'est un prolongement naturel — mais un choix produit.
- **Filet de rattrapage.** Un job planifié (ou une route admin) qui émet la Facture de toute commande **capturée sans Facture** — l'idempotence sur `order_id` le rend sûr, et une Facture manquante est un manquement légal, pas une commodité (§1.5). Recommandé, mais à spécifier.
- **Que contient exactement `frozen_data` ?** La liste précise des champs gelés (lignes, prix unitaires TTC/HT, taux et montant de TVA, totaux, adresse de facturation, coordonnées client, mentions légales obligatoires FR : n° facture, date, SIREN/TVA intracom du restaurant…). C'est une spec fonctionnelle à écrire (`docs/specs/`), pas une recherche technique.

---

## 5. Sources

**Repo (chemins tels quels) :**
- `CONTEXT.md` §§ *Facture*, *Facture — issued and frozen*, *Numéro de facture*, *Avoir*, *Annulation (remboursement)*.
- `docs/adr/0002-factures-issued-frozen.md` — *issued & frozen*, rejet du cycle de vie du tutoriel, trap API `pdfmake@0.3.x`.
- `docs/research/2026-07-16-medusa-notification-commande-ticket-cuisine.md` — §6 (choix `pdfmake`, hauteur/rendu vérifiés), seam `render.ts`, arbitrage déploiement.
- `apps/backend/src/lib/pdf/render.ts`, `apps/backend/src/lib/pdf/kitchen-ticket.ts`, `apps/backend/src/lib/pdf/__tests__/kitchen-ticket.unit.spec.ts` — patron pdfmake réutilisable + test au seam.
- `apps/backend/src/subscribers/auto-capture-payment.ts`, `apps/backend/src/subscribers/kitchen-ticket-notification.ts`, `apps/backend/src/subscribers/order-confirmation.ts` — patrons subscriber (order.placed, try/catch, idempotency).
- `apps/backend/src/modules/pickup/{index,service}.ts`, `apps/backend/src/modules/pickup/models/pickup-config.ts`, `apps/backend/src/modules/formule/{index,service}.ts`, `apps/backend/src/modules/formule/models/formule.ts` — patron module + service.
- `apps/backend/src/links/formule-composant-variant.ts` — patron Module Link.
- `apps/backend/package.json` — `@medusajs/*` @ **2.16.0**, `pdfmake@^0.3.11`.

**Medusa 2.16 (source installée, `dist` compilé) :**
- `@medusajs/types → dist/locking/index.d.ts` — `ILockingModule` (`execute`/`acquire`/`release`/`releaseAll`), `ILockingProvider`.
- `@medusajs/locking → dist/loaders/providers.js:26-33` — provider par défaut = `InMemoryLockingProvider` ; `dist/providers/in-memory.js` — `this.locks = new Map()`.
- `@medusajs/locking-postgres → dist/services/advisory-lock.js:15-40` — `execute` via `pg_advisory_xact_lock` en transaction ; `:42,:55` table `locking` (acquire/release) ; `:124` identifier `"locking-postgres"`.
- `@medusajs/utils → dist/modules-sdk/definition.js:31,64,79` — `Modules.LOCKING`, mappings package.
- `@medusajs/core-flows → dist/payment/workflows/capture-payment.js:53-55` — émission `PaymentEvents.CAPTURED` ; `@medusajs/utils → dist/core-flows/events.js:927` — `CAPTURED = "payment.captured"`.
- `@medusajs/types → dist/file/service.d.ts:35,50` (`createFiles`), `dist/file/mutations.d.ts` (`CreateFileDTO` : `filename`, `mimeType`, `content` base64, `access` défaut `private`).
- Skill `medusa-dev:building-with-medusa`, `reference/workflows.md` (steps + compensation, saga), `reference/module-links.md` (defineLink, migrations obligatoires).

**Documentation officielle (primaire, web) :**
- [PostgreSQL — *Sequence Manipulation Functions*](https://www.postgresql.org/docs/current/functions-sequence.html) : `nextval` jamais rembobiné ⇒ trous. **(principe Postgres général)**
- [PostgreSQL — *Explicit Locking* / Advisory Locks & `FOR UPDATE`](https://www.postgresql.org/docs/current/explicit-locking.html) : `pg_advisory_xact_lock` relâché en fin de transaction ; `FOR UPDATE` bloque les autres transactions jusqu'à la fin. **(principe Postgres général)**
- [Medusa — *Locking Module*](https://docs.medusajs.com/resources/infrastructure-modules/locking) : défaut in-memory *« single-instance environment »*, provider Postgres.
- [Medusa — *Invoice Generator tutorial*](https://docs.medusajs.com/resources/how-to-tutorials/tutorials/invoice-generator) : `display_id: model.autoincrement()`, cycle `stale`/régénération, `pdfContent` stocké — **le contre-modèle**, dont la numérotation et le stockage sont ici rejetés.

---

## Complément 2026-07-17 — échafaudage transactionnel MedusaService 2.16

> Ce complément clôt l'**unique inconnue technique** laissée ouverte au §4 (« l'ossature transactionnelle exacte dans un `MedusaService` 2.16 ») et la nuance de propagation de transaction du §1.3-C. Il est vérifié **directement contre la source Medusa `2.16.0` installée** (chemins `dist` cités) **et la doc officielle** — pas via le MCP MedusaDocs (indisponible en agent). Il ne rejoue aucune section : il rend actionnable le cœur atomique `issueInvoice` du §2.1 / §3, et confirme la frontière workflow↔transaction du §1.4. Versions inchangées (`@medusajs/* @ 2.16.0`, cf. `apps/backend/package.json`).

### C.1 Une transaction, plusieurs écritures : `@InjectManager` / `@InjectTransactionManager` / `@MedusaContext`

Le patron canonique de la doc officielle ([Medusa — *Perform Database Operations in a Service*](https://docs.medusajs.com/learn/fundamentals/modules/db-operations)) est **deux méthodes appariées** : une méthode publique décorée `@InjectManager()` qui délègue à une méthode protégée `@InjectTransactionManager()` ; les deux prennent en **dernier** paramètre un `@MedusaContext() sharedContext?: Context<EntityManager>`. Imports (vérifiés, cf. C.4) :

```ts
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
} from "@medusajs/framework/utils"
import { Context } from "@medusajs/framework/types"
import { EntityManager } from "@medusajs/framework/mikro-orm/knex"
```

Ce que **chaque décorateur fait réellement** (lu dans la source, pas seulement dans la doc) :

- **`@MedusaContext()`** ne fait qu'**enregistrer l'index** du paramètre contexte (`target.MedusaContextIndex_[propertyKey] = parameterIndex`) et exposer la constante `MedusaContextType = "MedusaContext"` (`@medusajs/utils → dist/modules-sdk/decorators/context-parameter.js`). C'est le drapeau que les deux autres décorateurs exigent — sans lui, ils *throw* (« *To apply @InjectManager you have to flag a parameter using @MedusaContext* »).
- **`@InjectManager()`** garantit qu'un **manager forké** existe dans le contexte : `copiedContext.manager ??= resourceWithManager.getFreshManager(originalContext)`, et **propage** un `transactionManager` déjà présent (`if (originalContext?.transactionManager) copiedContext.transactionManager = originalContext.transactionManager`). Par défaut `managerProperty = "baseRepository_"` — le repository de base que `MedusaService(...)` fournit automatiquement (`@medusajs/utils → dist/modules-sdk/decorators/inject-manager.js`). C'est la méthode d'**entrée** (lecture ou orchestration hors transaction).
- **`@InjectTransactionManager()`** est celui qui **ouvre la transaction**. Sa logique exacte (`inject-transaction-manager.js`) :

  ```js
  descriptor.value = async function (...args) {
    const originalContext = args[argIndex] ?? {}
    if (originalContext?.transactionManager) {        // (1) déjà en transaction → réutilise, n'en ouvre pas une 2e
      return await originalMethod.apply(this, args)
    }
    return await this[managerProperty].transaction(async (transactionManager) => {  // (2) sinon: ouvre UNE transaction
      const copiedContext = { /* …recopie originalContext… */ }
      copiedContext.transactionManager = transactionManager   // (3) l'EM transactionnel entre dans le contexte
      args[argIndex] = copiedContext
      return await originalMethod.apply(this, args)
    }, { manager: originalContext?.manager, transaction: originalContext?.transactionManager,
         isolationLevel: originalContext?.isolationLevel,
         enableNestedTransactions: originalContext.enableNestedTransactions ?? false })
  }
  ```

  Point clé pour l'idempotence *gapless* : la branche **(1)** fait qu'un `sharedContext` **déjà porteur d'un `transactionManager`** ne déclenche **pas** une seconde transaction — la méthode s'exécute dans celle du parent. **La propagation du contexte = partage de la transaction.** C'est exactement ce qui permet à `issueInvoice` d'appeler des méthodes CRUD générées (`createInvoices`, etc.) **dans la même transaction** que l'`UPDATE` du compteur : il suffit de leur repasser `sharedContext`.

Le `this[managerProperty].transaction(task, opts)` appelé en (2) est celui du `MikroOrmBaseRepository` : il **forke un manager** puis délègue à `transactionWrapper`, qui appelle la méthode MikroORM native `manager.transaction(task)` / `.transactional(task)` — le `task` reçoit l'**EntityManager transactionnel** (`@medusajs/utils → dist/dal/mikro-orm/mikro-orm-repository.js:18-29` : `getFreshManager`, `getActiveManager`, `transaction` ; `dist/dal/utils.js:5-22` : `transactionWrapper`). Autrement dit, `sharedContext.transactionManager` **est** un `EntityManager` MikroORM/Knex ouvert sur une transaction Postgres réelle.

### C.2 L'incrément atomique du compteur : `manager.execute(sql, params)` avec `RETURNING`

Dans la méthode `@InjectTransactionManager()`, on récupère l'EM transactionnel via `sharedContext.transactionManager` (doc : `const transactionManager = sharedContext?.transactionManager`) et on lui parle en **SQL brut** par `manager.execute(sql, params)` — l'API MikroORM que Medusa lui-même utilise partout pour le SQL brut (placeholders `?`, tableau de params, **retour = tableau de lignes**). Preuves d'usage dans la source installée :

- `@medusajs/locking-postgres → dist/services/advisory-lock.js:26` — `manager.execute(\`SELECT ${fnName}(?)\`, [numKey])` (le `pg_advisory_xact_lock` du §1.2), et `:42`/`:81` — `const [row] = await this.getManager().execute(\`SELECT owner_id … WHERE id = ?\`, [key])` puis `execute(\`UPDATE locking SET … WHERE id = ?\`, [ownerId, key])`.

L'incrément *gapless* du §1.3-A devient donc, **dans une seule méthode transactionnelle** :

```ts
class InvoiceModuleService extends MedusaService({ Invoice, InvoiceCounter }) {
  @InjectManager()
  async issueInvoice(
    input: { order_id: string; frozen_data: Record<string, unknown> },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return await this.issueInvoice_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async issueInvoice_(
    input: { order_id: string; frozen_data: Record<string, unknown> },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    const manager = sharedContext!.transactionManager!   // EntityManager transactionnel (C.1)

    // Idempotence (§1.4) : si la Facture existe déjà pour cette commande, on la renvoie
    // sans consommer de numéro. (Alternative : s'appuyer sur unique(order_id) + upsert.)
    const [existing] = await manager.execute(
      `SELECT * FROM invoice WHERE order_id = ? LIMIT 1`, [input.order_id]
    )
    if (existing) return existing

    // (A) incrément atomique du compteur, dans CETTE transaction
    const [{ value }] = await manager.execute(
      `UPDATE invoice_counter SET value = value + 1 WHERE id = ? RETURNING value`,
      ["facture"]
    )

    // (B) insertion de la Facture avec ce numéro, MÊME transaction → commit/rollback en bloc.
    //     Passer sharedContext à la méthode CRUD générée la fait tourner dans la même TX (C.1, branche (1)).
    const [invoice] = await this.createInvoices(
      [{ number: value, order_id: input.order_id, frozen_data: input.frozen_data, issued_at: new Date() }],
      sharedContext
    )
    return invoice
  }
}
```

**Atomicité confirmée par construction** : `(A)` et `(B)` s'exécutent sur le **même** `transactionManager` fourni par le `this.baseRepository_.transaction(...)` de `@InjectTransactionManager` (C.1). Si `(B)` échoue, la transaction MikroORM *rollback* — l'`UPDATE +1` est annulé, **aucun numéro n'est brûlé**. Si tout réussit, un seul `commit`. Le verrou de ligne Postgres sur `invoice_counter` (pris par l'`UPDATE`) sérialise les allocations concurrentes jusqu'à ce commit (§1.3-A/B). C'est la garantie *gapless* du §1.2-2, désormais outillée.

> Deux détails d'implémentation, non bloquants : (i) `manager.execute` renvoie les lignes en *snake_case* brut (pas d'hydratation d'entité) — parfait pour lire `value`. (ii) On peut mélanger SQL brut (`UPDATE … RETURNING`) et méthodes générées (`createInvoices`) dans la même transaction **à condition** de repasser `sharedContext` aux secondes ; sinon `@InjectManager`/`@InjectTransactionManager` de la méthode générée, ne voyant pas de `transactionManager`, **ouvrirait sa propre transaction** (branche (2)) et casserait l'atomicité. Repasser le contexte n'est donc pas cosmétique — c'est la condition de l'atomicité.

### C.3 Frontière workflow ↔ transaction : l'atomicité vit dans l'appel de service, pas dans le workflow

Confirmation directe de la doc pour lever la nuance du §1.4 et du corollaire §1.4 :

- **Un workflow n'est pas une transaction ACID unique.** La doc *Compensation Function* ([Medusa](https://docs.medusajs.com/learn/fundamentals/workflows/compensation-function)) : chaque step **persiste ses changements indépendamment** ; si un step ultérieur échoue, Medusa **appelle les fonctions de compensation** des steps précédents pour *défaire* manuellement — **modèle saga, pas rollback base de données**. Il n'y a donc **pas** de transaction Postgres qui engloberait plusieurs steps.
- **Conséquence pratique confirmée** : l'atomicité « allouer le numéro + insérer la Facture » **doit tenir entièrement dans UN appel de méthode de service** (`issueInvoice`, une transaction MikroORM, C.1-C.2), **jamais** éclatée sur deux steps de workflow. Un step ne fournit **aucune** frontière transactionnelle partagée avec le suivant. Le step ne fait que *déléguer* à `service.issueInvoice(...)` — c'est la méthode, décorée `@InjectTransactionManager`, qui porte la transaction ; le workflow n'apporte que l'orchestration (retry, idempotence, enchaînement PDF→fichier) autour de ce cœur atomique **non compensable**. Cela valide sans réserve la séquence du §3 (`issueInvoiceStep` → `service.issueInvoice()` `[1 TRANSACTION, non compensable]`) et le corollaire du §1.4.

Corollaire sur l'option C (§1.3, Locking Module) : `lockingModule.execute(keys, job)` ouvre **sa** transaction dans le provider Postgres et exécute `job` dedans (§1.2). Pour que l'insert Facture partage ce verrou, il faudrait que `job` reçoive et propage le `transactionManager` de la locking-provider jusqu'au service `invoice` — or `ILockingModule.execute` ne passe qu'un `sharedContext` *optionnel* et n'expose pas l'EM de sa propre transaction au `job`. **La propagation « verrou advisory → insert Facture dans la même TX » n'est donc pas offerte nativement** : C ne fait que *sérialiser* autour d'un cœur qui doit **de toute façon** être atomique par lui-même (l'`UPDATE … RETURNING` de C.2). Cela **confirme le non-vérifié du §4** et renforce la reco §3-2 : **commencer sans Locking Module (option A pure) ; l'atomicité *gapless* ne dépend pas de lui.**

### C.4 Wiring Locking Module (chemin optionnel), confirmé pour 2.16

Pour mémoire, si l'option C est un jour retenue comme point de sérialisation nommé (§1.3-C) :

- **Interface** `ILockingModule` — `execute(keys, job, args?, sharedContext?)`, `acquire(keys, args?, sharedContext?)`, `release(keys, args?, sharedContext?)`, `releaseAll(...)` (§1.2, `@medusajs/types → dist/locking/index.d.ts`).
- **Résolution** : `container.resolve(Modules.LOCKING)` (`Modules.LOCKING = "locking"`), ou clé DI standard. Doc : « *Modules.LOCKING constant / ContainerRegistrationKeys* » ([Medusa — Locking Module](https://docs.medusajs.com/resources/infrastructure-modules/locking)).
- **Provider par défaut = in-memory, mono-instance** (§1.2) — *« not recommended for production … single-instance environment »*. Le provider **Postgres** (`pg_advisory_xact_lock`, inter-instances) se déclare dans `medusa-config.ts` (doc *Locking — PostgreSQL provider*) :

  ```ts
  module.exports = defineConfig({
    modules: [
      {
        resolve: "@medusajs/medusa/locking",
        options: {
          providers: [
            { resolve: "@medusajs/medusa/locking-postgres", id: "locking-postgres", is_default: true },
          ],
        },
      },
    ],
  })
  ```

### C.5 Ce qui reste non confirmable depuis les sources publiques

- **Comportement transactionnel de `manager.execute` avec `RETURNING` sur le provider MikroORM/Knex Postgres exact de 2.16 sous forte concurrence** — vérifié *par lecture de la source* (l'API et son usage interne par `locking-postgres`), **non exécuté** dans cette session (pas de Postgres lancé). Le principe (verrou de ligne + `RETURNING`, un commit) est un invariant Postgres, indépendant de Medusa.
- **Propagation `transactionManager` locking-provider → service `invoice`** (C.3) : *confirmé absente* de l'API publique `ILockingModule.execute`, donc l'option C reste « sérialisation seule » — mais je n'ai pas trouvé de contre-exemple documenté qui l'offrirait ; à re-tester si un besoin réel de C émerge.
- Tout le reste de la question posée (décorateurs, imports, `sharedContext.transactionManager`, atomicité intra-méthode, frontière workflow) est **confirmé** contre source installée + doc officielle.

**Sources ajoutées par ce complément :**
- `@medusajs/utils → dist/modules-sdk/decorators/{context-parameter,inject-manager,inject-transaction-manager}.js` — implémentation réelle des trois décorateurs (drapeau d'index, forge du manager, ouverture/réutilisation de transaction).
- `@medusajs/utils → dist/dal/mikro-orm/mikro-orm-repository.js:18-29` (`getFreshManager`/`getActiveManager`/`transaction`) et `dist/dal/utils.js:5-22` (`transactionWrapper` → `manager.transaction`/`.transactional`).
- `@medusajs/locking-postgres → dist/services/advisory-lock.js:26,42,81` — usage réel de `manager.execute(sql, params)` (dont `RETURNING`-style et `pg_advisory_xact_lock`).
- `@medusajs/types → dist/shared-context.d.ts` — type `Context<TManager>` (`transactionManager`, `manager`, `isolationLevel`, `enableNestedTransactions`).
- `@medusajs/framework/package.json` — export maps `./utils` (→ `@medusajs/utils`), `./mikro-orm/knex`, `./types` (chemins d'import publics confirmés).
- [Medusa — *Perform Database Operations in a Service*](https://docs.medusajs.com/learn/fundamentals/modules/db-operations) — patron `@InjectManager`/`@InjectTransactionManager`/`@MedusaContext`, `sharedContext.transactionManager`, réutilisation de transaction par propagation du contexte.
- [Medusa — *Compensation Function*](https://docs.medusajs.com/learn/fundamentals/workflows/compensation-function) — saga (compensation manuelle), pas de transaction ACID inter-steps.
- [Medusa — *Locking Module*](https://docs.medusajs.com/resources/infrastructure-modules/locking) — résolution `Modules.LOCKING`, défaut in-memory, registration `locking-postgres` (`is_default: true`).
