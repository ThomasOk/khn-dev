# Medusa 2.16 : la Notification de commande et le Ticket cuisine en pièce jointe

**Date** : 2026-07-16
**Versions vérifiées** : Medusa **2.16.0** (`apps/backend/package.json`), `resend` **6.14.0**, `@mikro-orm/core` **6.6.14**
**Statut** : recherche — aucune décision prise. La section « Recommandation » est écrite pour être convertie en ADR.

> **Amendement du 2026-07-16, après coup.** La première version de cette note recommandait `@react-pdf/renderer` **sans avoir lu l'ADR 0002**, qui a déjà tranché **`pdfmake`** pour la Facture. Deux éléments nouveaux — cet ADR, et le PDF du système actuel (`orecap.pdf`) — ont renversé la recommandation. Voir **§6**, qui fait autorité sur §2.2 et §4. Les §1 (pièces jointes) et §3 (imprimabilité) sont inchangés et tiennent toujours.

## La question

Comment envoyer au restaurateur, à la commande (`order.placed`), un **second** email — la **Notification de commande** — portant le **Ticket cuisine** en pièce jointe, sachant que le premier email (la confirmation client) part déjà par le même chemin ?

Trois inconnues, dans l'ordre où elles bloquent :

1. Le module Notification de Medusa 2.16 et notre provider Resend supportent-ils une pièce jointe sur `createNotifications` ? Quelle forme exacte, quelles limites ?
2. Comment produire un document contraint à **80 mm de large** — le seul repère physique que donne CONTEXT.md ? PDF ? HTML ? PNG ? Avec quelle lib, et à quel prix en dépendances ?
3. Le Ticket cuisine doit rester **lisible et imprimable depuis l'email** — il ne pilote pas l'imprimante.

## Convention de citation

Les paquets Medusa sont résolus par pnpm dans `node_modules/.pnpm/@medusajs+<pkg>@2.16.0_<hash>/node_modules/@medusajs/<pkg>/`. Pour la lisibilité, les citations sont notées **`@medusajs/<pkg> → dist/chemin.js:ligne`**. Les paquets ne publient que du `dist` compilé. Les chemins du repo sont donnés tels quels.

Tout ce qui est affirmé ici sans citation est soit une évidence, soit **signalé comme non vérifié**.

---

## 1. Inconnue 1 — les pièces jointes sur `createNotifications`

**Réponse courte : oui, le champ existe et traverse tout le module jusqu'au provider. Mais il n'est jamais persisté, et notre provider Resend actuel ne le lit pas.** Les trois points ci-dessous se lisent ensemble.

### 1.1 Le type existe, bout en bout

Le type `Attachment` est défini dans `@medusajs/types` :

```ts
// @medusajs/types → dist/notification/common.d.ts:8-28
export interface Attachment {
    /** The content of the attachment, encoded as a binary string. */
    content: string;
    /** The filename of the attachment. */
    filename: string;
    /** The MIME type of the attachment. */
    content_type?: string;
    /** The disposition of the attachment, For example, "inline" or "attachment". */
    disposition?: string;
    /** The ID, if the attachment is meant to be referenced within the body of the message. */
    id?: string;
}
```

Et il est présent aux **trois** points de passage :

- **l'entrée de `createNotifications`** — `attachments?: Attachment[] | null` (`@medusajs/types → dist/notification/mutations.d.ts:63-65`, `CreateNotificationDTO`) ;
- **l'entrée du provider** — `attachments?: Attachment[] | null` (`@medusajs/types → dist/notification/provider.d.ts:17-19`, `ProviderSendNotificationDTO`) ;
- **l'étape de workflow** `sendNotificationsStep` (`@medusajs/core-flows → dist/notification/steps/send-notifications.d.ts:65-67`), qui n'est qu'un passe-plat vers `createNotifications` (`.../send-notifications.js:10-13`).

Le chemin d'exécution est vérifiable ligne à ligne. Le service du module fabrique un objet en **étalant l'entrée telle quelle** :

```js
// @medusajs/notification → dist/services/notification-module-service.js:59-69
const normalizedNotificationsToProcess = notificationsToProcess.map((entry) => {
    const provider = providers.find((provider) => provider?.channels.includes(entry.channel));
    return {
        provider,
        data: {
            id: (0, utils_1.generateEntityId)(undefined, "noti"),
            ...entry,                       // ← `attachments` est ici
            provider_id: provider?.id,
        },
    };
});
```

puis passe **ce même objet** au provider :

```js
// @medusajs/notification → dist/services/notification-module-service.js:93-94
const res = await this.notificationProviderService_
    .send(provider, entry.data)
```

et le service de provider ne filtre rien :

```js
// @medusajs/notification → dist/services/notification-provider.js:60-63
async send(provider, notification) {
    const providerHandler = this.retrieveProviderRegistration(provider.id);
    return await providerHandler.send(notification);
}
```

**Conclusion : `attachments` passé à `createNotifications` arrive intact dans le `send()` de notre provider.** C'est acquis.

La preuve par l'usage : le provider de référence de Medusa, SendGrid, lit exactement ce champ —

```js
// @medusajs/notification-sendgrid → dist/services/sendgrid.js:23-31
const attachments = Array.isArray(notification.attachments)
    ? notification.attachments.map((attachment) => ({
        content: attachment.content,          // Base64 encoded string of the file
        filename: attachment.filename,
        content_type: attachment.content_type, // MIME type (e.g., 'application/pdf')
        disposition: attachment.disposition ?? "attachment",
        id: attachment.id ?? undefined,
    }))
    : undefined;
```

et le pose sur le message (`.../sendgrid.js:50`). **Le commentaire `// Base64 encoded string of the file` (ligne 25) est la seule indication de Medusa sur ce que « encoded as a binary string » veut dire dans `common.d.ts:10`.** Les deux formulations se contredisent ; c'est le provider de référence qui tranche : **base64**.

### 1.2 Le piège : rien n'est persisté, et personne ne vous le dira

Le modèle `notification` **n'a pas de colonne `attachments`** :

```js
// @medusajs/notification → dist/models/notification.js
exports.Notification = utils_1.model.define("notification", {
    id, to, from, channel, template,
    data,           // json
    provider_data,  // json
    trigger_type, resource_id, resource_type, receiver_id,
    original_notification_id, idempotency_key, external_id, status, provider,
});
```

Or `createNotifications_` **insère `entry.data`** — qui contient `attachments` — en base :

```js
// @medusajs/notification → dist/services/notification-module-service.js:70-75
const toCreate = normalizedNotificationsToProcess
    .filter((e) => !e.data.idempotency_key || !existsMap.has(e.data.idempotency_key))
    .map((e) => e.data);
const createdNotifications = toCreate.length
    ? await this.notificationService_.create(toCreate, context)
    : [];
```

Est-ce que ça explose ? **Non.** Le repository appelle `manager.create(this.entity, data_)` (`@medusajs/utils → dist/dal/mikro-orm/mikro-orm-repository.js:166-173`), et MikroORM n'hydrate que les propriétés déclarées dans la metadata de l'entité (`@mikro-orm/core@6.6.14 → entity/EntityFactory.js`, `createEntity` → `this.hydrate(entity, meta, data, options)`). Le validateur, lui aussi, n'itère que `meta.props` :

```js
// @mikro-orm/core@6.6.14 → entity/EntityValidator.js:15-36
validate(entity, payload, meta) {
    meta.props.forEach(prop => { /* … */ });
}
```

…et il est instancié avec `strict` (`@mikro-orm/core → EntityManager.js:60`), dont la valeur par défaut est `false` (`@mikro-orm/core → utils/Configuration.js:36`).

**Conséquence : `attachments` est silencieusement jeté à l'écriture en base, sans erreur ni log.** Deux corollaires qui comptent :

- **La pièce jointe n'est pas archivée.** La table `notification` gardera la trace de l'envoi (`to`, `template`, `status`, `external_id`) mais **pas le ticket**. Ce n'est pas un problème pour KHN — CONTEXT.md § *Notification de commande* dit explicitement que la notification est *« une commodité, pas le registre »*, et le Ticket cuisine est reproductible à volonté depuis la Commande. Mais il faut le savoir : **on ne pourra pas rejouer une notification et retrouver l'octet près le ticket envoyé.** (Contraste utile : ce serait rédhibitoire pour la **Facture**, qui est *« issued and frozen »* — ADR 0002. Ne pas transposer ce mécanisme à la Facture sans y repenser.)
- **`NotificationDTO.attachments` (`common.d.ts:49-51`) est un type menteur.** Le champ est déclaré sur le DTO de lecture alors qu'aucune colonne ne le porte : la valeur retournée par `createNotifications` ne contiendra jamais d'`attachments`. Ne rien construire dessus.

### 1.3 Notre provider Resend ne lit pas `attachments` — et la forme n'est pas celle de Medusa

Le provider maison ignore purement le champ :

```ts
// apps/backend/src/modules/resend-notification/service.ts:13-18, 32-48
type NotificationData = {
  to: string
  template: string
  channel: string
  data?: Record<string, unknown>      // ← pas d'`attachments`
}

async send(notification: NotificationData) {
  const { subject, html } = await this.renderTemplate(notification.template, notification.data ?? {})
  const { data, error } = await this.resend.emails.send({
    from: this.from, to: notification.to, subject, html,   // ← pas d'`attachments`
  })
  // …
}
```

Le supporter demande deux choses : élargir le type local (ou, mieux, utiliser `NotificationTypes.ProviderSendNotificationDTO` de `@medusajs/framework/types`, qui est le contrat réel du `send`), **et mapper les noms de champs**. Car les deux formes ne coïncident pas :

| Medusa (`@medusajs/types → dist/notification/common.d.ts:8-28`) | Resend SDK (`resend@6.14.0 → dist/index.d.mts:602-616`) |
|---|---|
| `content: string` (base64) | `content?: string \| Buffer` |
| `filename: string` | `filename?: string \| false \| undefined` |
| `content_type?: string` | `contentType?: string` — **camelCase** |
| `id?: string` | `contentId?: string` — **camelCase**, sémantique « cid: » |
| `disposition?: string` | *aucun équivalent* — Resend infère « inline » de la présence de `contentId` |
| — | `path?: string` (URL où le fichier est hébergé) |

Autrement dit : **le mapping snake_case → camelCase est à faire à la main**, et `disposition` n'a nulle part où aller. Passer un `Attachment` Medusa tel quel à `resend.emails.send()` produirait une pièce jointe sans `contentType` — non pas une erreur, mais un type MIME deviné par Resend depuis le `filename` (`dist/index.d.mts:610` : *« Optional content type for the attachment, if not set will be derived from the filename property »*). Avec un `.pdf`, ça marcherait probablement ; c'est le genre de « probablement » qu'on ne veut pas dans un email de production.

### 1.4 Les limites Resend

- **40 Mo par email, après encodage base64** — [resend.com/docs/api-reference/emails/send-email](https://resend.com/docs/api-reference/emails/send-email), corroboré par le docstring du SDK installé : *« Filename and content of attachments (max 40mb per email) »* (`resend@6.14.0 → dist/index.d.mts:520-526`). Pour un ticket de cuisine d'un ou deux kilo-octets, la limite est **hors sujet de trois ordres de grandeur**.
- **`content` accepte `string | Buffer`** (`dist/index.d.mts:604`). La doc API précise *« passed as a buffer or Base64 string »*. Comme Medusa type `Attachment.content` en `string` et que SendGrid y met du base64 (§1.1), **on reste en base64** : `buffer.toString("base64")`.
- **L'envoi en batch ne supporte pas les pièces jointes** :
  ```ts
  // resend@6.14.0 → dist/index.d.mts (CreateBatchEmailOptions)
  type CreateBatchEmailOptions = Omit<CreateEmailOptions, 'attachments' | 'scheduledAt'>;
  ```
  Sans conséquence ici — on envoie deux emails distincts (client, restaurateur), pas un batch. Mais si quelqu'un veut un jour « optimiser » en groupant les deux envois, cette ligne le lui interdit.

---

## 2. Inconnue 2 — produire un document large de 80 mm

### 2.1 Ce que « 80 mm » veut dire, et surtout ce qu'il ne dit pas

CONTEXT.md § *Ticket cuisine* : *« Sa contrainte structurante est la **largeur** : 80 mm de papier, donc chaque ligne imprimée doit mériter sa place. »* C'est **tout** ce que le domaine donne. Trois choses en découlent, et il faut les nommer avant de choisir une lib :

- **80 mm est la largeur du papier, pas la largeur imprimable.** Les imprimantes thermiques 80 mm impriment sur une bande plus étroite que le rouleau. **Je n'ai pas pu vérifier de valeur** : le repo ne dit pas quelle imprimante le restaurant possède, et je n'ai trouvé aucune spécification citable sans savoir le modèle. À traiter comme **non vérifié** — c'est une mesure à faire sur place, pas une constante à deviner ici.
- **La hauteur est libre.** Un rouleau est continu. Un Ticket cuisine à trois lignes et un à vingt lignes n'ont pas la même longueur, et forcer une hauteur A4 ferait éjecter du papier blanc à chaque commande. **La lib choisie doit gérer une page de largeur fixe et de hauteur variable** — c'est le critère discriminant que le reste de cette section teste.
- **80 mm à 72 dpi = 226,77 points** (`80 × 72 ÷ 25,4`). C'est le nombre qui apparaîtra dans le code quelle que soit l'option.

### 2.2 Les options

#### A. `pdfkit` — impératif, léger, aucune dépendance système

Le format de page accepte un tableau de points :

```js
// pdfkit → lib/page.js
const dimensions = Array.isArray(this.size)
  ? this.size
  : SIZES[this.size.toUpperCase()];
```
([source](https://raw.githubusercontent.com/foliojs/pdfkit/master/lib/page.js))

Donc `new PDFDocument({ size: [226.77, hauteur] })`. **Mais `hauteur` doit être connue d'avance** — pdfkit est un moteur impératif : il ne mesure pas un layout avant de le dessiner. Pour un ticket de longueur variable, il faut soit calculer la hauteur soi-même (compter les lignes × interligne, en tenant compte des retours à la ligne — donc réimplémenter une mesure de texte), soit accepter une page trop longue. C'est le coût caché de l'option la plus légère.

- **Poids** : `pdfkit@0.19.1`, 8,4 Mo décompressés, 6 dépendances dont `fontkit` (5,6 Mo). Pure JS.
- **Dépendances système** : aucune.
- **Accents français** : les 14 polices standard (Helvetica…) sont disponibles sans embarquer de fichier, et pdfkit sait embarquer du TTF/OTF ([pdfkit.org/docs/text.html](https://pdfkit.org/docs/text.html)). **La doc ne dit rien de l'encodage des polices standard** — je n'ai donc pas vérifié que `é`, `è`, `à`, `ç` sortent correctement avec Helvetica sans police embarquée. **À tester avant de s'engager** : un Ticket cuisine sur lequel « Bœuf » s'imprimerait « Buf » est un bug muet, et le seul mot que le cuisinier avait besoin de lire.

#### B. `@react-pdf/renderer` — déclaratif, et il gère la hauteur automatique

Le prop `size` accepte quatre formes, dont un objet et des unités :

```ts
// @react-pdf/layout → src/page/getSize.ts
if (typeof value === 'string')      size = getStringSize(value);
else if (Array.isArray(value))      size = transformUnits(toSizeObject(value), dpi);
else if (typeof value === 'number') size = transformUnits(getNumberSize(value), dpi);
else                                size = transformUnits(value, dpi);
```

et `transformUnit` convertit nativement les millimètres :

```ts
const mmFactor = (1 / 25.4) * outputDpi;   // outputDpi = 72
switch (scalar.unit) {
  case 'in': return scalar.value * outputDpi;
  case 'mm': return scalar.value * mmFactor;
  case 'cm': return scalar.value * cmFactor;
  case 'px': return Math.round(scalar.value * (outputDpi / inputDpi));
  default:   return scalar.value;          // sans unité ⇒ points
}
```
([source](https://raw.githubusercontent.com/diegomura/react-pdf/master/packages/layout/src/page/getSize.ts))

On écrit donc littéralement `<Page size={{ width: "80mm" }}>` — **la contrainte du domaine apparaît telle quelle dans le code**. Et la doc officielle dit : *« Height is optional, if ommited it will behave as "auto" »* ([react-pdf.org/components](https://react-pdf.org/components)). **C'est exactement le comportement qu'un rouleau demande.** *(Je n'ai pas exécuté ce cas — à confirmer empiriquement, c'est le point à tester en premier si cette option est retenue.)*

Rendu côté serveur : `renderToBuffer`, `renderToStream`, `renderToFile`, `renderToString` ([react-pdf.org/advanced](https://react-pdf.org/advanced)). `renderToBuffer` → `.toString("base64")` alimente directement l'`Attachment` de §1.

- **Poids** : `@react-pdf/renderer@4.5.1`, 292 Ko lui-même, mais l'arbre réel pèse — `@react-pdf/pdfkit` (1,3 Mo, un fork de pdfkit), `yoga-layout` (224 Ko, moteur de layout Flexbox en WASM), `fontkit` (5,6 Mo, transitif). **Grosso modo le même ordre de grandeur que pdfkit seul**, puisque pdfkit et fontkit sont dedans de toute façon. Le surcoût réel de B par rapport à A est *yoga-layout* — quelques centaines de kilo-octets pour le moteur de layout qu'on aurait écrit à la main sinon.
- **Dépendances système** : aucune. Le WASM de yoga est embarqué.
- **Compat React** : `peerDependencies: { react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0" }`. Le backend a `react@^18.3.1` (`apps/backend/package.json`) — **compatible**.
- **Cohérence avec l'existant** : le repo rend déjà ses emails en React (`@react-email/render`, `apps/backend/src/modules/resend-notification/service.ts:2, 57`). Un template PDF en React est le même geste, dans le même fichier de conventions.

#### C. Chromium headless (Puppeteer / Playwright) — HTML → PDF

Séduisant : on écrit du CSS (`@page { size: 80mm auto; }`), on obtient un PDF, la hauteur automatique est native. C'est aussi, et de loin, l'option la plus chère.

- **Poids** : `puppeteer@25.3.0` ne pèse que 42 Ko, mais il télécharge un Chromium à l'installation. Le paquet `@sparticuz/chromium` (le binaire couramment utilisé en serverless) pèse **~70 Mo décompressés** (`npm view @sparticuz/chromium dist.unpackedSize` → `69678316`) — et c'est la variante *compressée pour Lambda*, pas un Chromium complet.
- **Dépendances système** : un Chromium a besoin de bibliothèques partagées (fontconfig, nss, libdrm…) qui **ne sont pas dans une image Node slim**. Cela se règle — mais cela se règle dans un Dockerfile.
- **Version de Node** : `puppeteer@25.3.0` déclare `engines: { node: ">=22.12.0" }`. Le backend déclare `engines: { node: ">=20" }` (`apps/backend/package.json`). **Ce n'est pas bloquant, mais c'est une contrainte à trancher explicitement, pas à découvrir en CI.**
- **Déploiement** : **le repo ne contient aucun Dockerfile, aucun `fly.toml`, aucun `render.yaml`** (vérifié : recherche infructueuse à la racine et sur deux niveaux). **La cible de déploiement n'est pas décidée.** Choisir aujourd'hui une lib qui exige un Chromium, c'est **contraindre une décision de déploiement qui n'est pas encore prise, pour imprimer un ticket de trente lignes.**

#### D. `satori` + `@resvg/resvg-js` — JSX → SVG → PNG

- **Poids** : `satori@0.28.0` (5,6 Mo) + `@resvg/resvg-js@2.6.2`.
- **Dépendances système** : `@resvg/resvg-js` est un **binding natif napi-rs** — 12 binaires optionnels par plateforme (`darwin-arm64`, `linux-x64-gnu`, `linux-x64-musl`, `linux-arm64-gnu`…). Ça marche sans compilateur *si* la plateforme est couverte, mais ça introduit une **dépendance à l'architecture d'exécution** — et le lockfile d'un Mac ARM n'est pas celui d'un conteneur Linux musl.
- **Satori exige des polices fournies explicitement** (pas de fallback système), ce qui est un travail supplémentaire.
- **Et surtout, la sortie est un PNG** : une image rasterisée à une résolution figée. Pour un document destiné à l'impression, c'est un choix strictement inférieur à un PDF vectoriel — voir §3.

#### E. Pas de pièce jointe du tout — le ticket dans le corps HTML de l'email

L'option qu'il faut nommer pour pouvoir la rejeter honnêtement : mettre le Ticket cuisine dans le corps de l'email, dans un `<div>` de 80 mm avec une `@media print`, et laisser le restaurateur faire Ctrl+P.

- **Coût : zéro.** Un template react-email de plus, la lib est déjà là.
- **Mais ça ne tient pas.** Le rendu à l'impression dépend du **client mail** : Gmail web, Outlook et Apple Mail ne traitent pas `@media print` de la même façon, aucun ne garantit `@page { size: 80mm auto }`, et le chrome du client (en-têtes « De / À / Objet », marges du navigateur) s'imprime **avec** le ticket. Le document ferait 80 mm de large *dans le CSS* et 210 mm *sur le papier*. La contrainte de largeur — le seul repère physique que le domaine ait donné — serait **un vœu, pas une propriété du fichier**.
- Non retenu, mais **la version dégradée en vaut la peine** : voir §3.

### 2.3 Tableau comparatif

| | A. pdfkit | B. @react-pdf/renderer | C. Chromium headless | D. satori+resvg | E. HTML inline |
|---|---|---|---|---|---|
| Largeur 80 mm garantie dans le fichier | ✅ `[226.77, h]` | ✅ `size={{width:"80mm"}}` | ✅ `@page` | ✅ | ❌ dépend du client mail |
| Hauteur variable (rouleau) | ❌ à calculer soi-même | ✅ `height` omise ⇒ auto *(à confirmer)* | ✅ natif | ✅ | ✅ |
| Dépendance système | aucune | aucune | **Chromium + libs** | binding natif par plateforme | aucune |
| Poids d'install | ~8 Mo | ~8 Mo (mêmes pdfkit+fontkit, + yoga) | **~70 Mo+** | ~6 Mo + binaires | 0 |
| Contraint le déploiement | non | non | **oui** (Dockerfile requis, non décidé) | oui (arch. du lockfile) | non |
| Node requis | — | — | **≥22.12** (repo : ≥20) | — | — |
| Cohérent avec l'existant (React) | ❌ impératif | ✅ même geste que react-email | ➖ | ➖ | ✅ |
| Sortie | PDF vectoriel | PDF vectoriel | PDF vectoriel | **PNG rasterisé** | — |

---

## 3. Inconnue 3 — lisible et imprimable depuis l'email

La contrainte est plus faible qu'elle n'en a l'air, et c'est ce qui débloque le choix. Le Ticket cuisine ne pilote pas l'imprimante : **il faut qu'un humain pressé, sur le téléphone ou le PC du comptoir, l'ouvre et l'imprime en deux gestes.** Trois conséquences :

- **Le PDF est le seul format qui porte sa propre mise en page.** Un PDF de 226,77 pt de large *est* large de 80 mm, dans le fichier, indépendamment du client mail, du navigateur et de l'OS. Le PNG (option D) porte des pixels : son échelle à l'impression dépend du DPI que le visionneur décide d'appliquer. Le HTML (option E) ne porte rien du tout. **Pour un document dont la contrainte structurante est une dimension physique, un PDF vectoriel n'est pas un choix parmi d'autres — c'est le seul format qui exprime la contrainte.**
- **Le PDF s'ouvre partout nativement** — iOS, Android, Windows, macOS — et s'imprime depuis l'aperçu, sans installer quoi que ce soit. C'est le format que le restaurateur a déjà utilisé mille fois. À noter que le domaine le connaît déjà : la **Carte sur place** est *« un PDF fait main servi en fichier statique »* (CONTEXT.md).
- **Et il faut quand même un corps d'email lisible.** L'email ne doit **pas** être vide avec juste une pièce jointe : le restaurateur doit pouvoir décider s'il court, sans ouvrir le PDF. Le corps porte l'essentiel — **numéro de commande, nom du client, Créneau de retrait** — et la pièce jointe porte le document à imprimer. C'est aussi le filet quand la pièce jointe est illisible sur un vieux téléphone. C'est la version utile de l'option E : **en complément, jamais en remplacement.**

Un dernier point de conception, qui n'est pas une question de lib. CONTEXT.md § *Notification de commande* : *« c'est une commodité, pas le registre […] la liste des commandes de l'admin Medusa est la source de vérité »*. Le subscriber existant respecte déjà cette règle sans le dire — il **avale ses erreurs** :

```ts
// apps/backend/src/subscribers/order-confirmation.ts:113-115
} catch (error) {
  logger.error(`Échec envoi email commande ${data.id}: ${error.message}`)
}
```

**La Notification de commande doit faire pareil, et pour la même raison** : un ticket qui ne se génère pas ne doit jamais faire échouer une commande payée. Le corollaire, moins confortable : **un échec silencieux est un échec invisible.** C'est précisément pour ça que CONTEXT.md dit d'aller regarder l'admin avant le service — et cette phrase du domaine n'est utile que si quelqu'un la lit.

---

## 4. Recommandation

> **Un second subscriber sur `order.placed`, un template `kitchen-ticket` rendu en PDF 80 mm par `@react-pdf/renderer`, passé en `attachments` (base64) à `createNotifications`, avec le mapping snake_case → camelCase fait dans le provider Resend.**

Rédigé pour un ADR :

**Décision.** La Notification de commande est un **subscriber distinct** de `order-confirmation.ts`, écoutant le même `order.placed`, et envoyant à l'adresse du restaurant (option de module, comme `from` aujourd'hui — `apps/backend/src/modules/resend-notification/service.ts:8-11`). Le Ticket cuisine est un composant `@react-pdf/renderer` rendu par `renderToBuffer`, encodé en base64, et passé dans `attachments: [{ content, filename, content_type: "application/pdf" }]` à `createNotifications`. Le provider Resend est étendu pour mapper l'`Attachment` de Medusa vers celui de Resend.

**Pourquoi deux subscribers et pas un.** Ce sont deux documents, deux destinataires, deux raisons de changer. Le domaine le dit déjà pour les documents : *« La Facture et le Ticket cuisine sont générés depuis la même Commande mais ne sont pas deux rendus d'un même template — un document qui servirait à la fois le cuisinier et le comptable ne servirait ni l'un ni l'autre »* (CONTEXT.md § *Facture*). L'argument vaut mot pour mot ici. Et opérationnellement : **si le rendu du PDF plante, la confirmation client doit partir quand même.** Deux subscribers, deux `try/catch`, deux échecs indépendants. Un seul subscriber ferait de la génération du ticket un point de défaillance pour l'email du client — pour un email qui, lui, est *le* contact avec le client.

**Pourquoi `@react-pdf/renderer` plutôt que pdfkit.** Le surcoût de B sur A est **yoga-layout, quelques centaines de kilo-octets** — pdfkit et fontkit sont dans les deux arbres de toute façon. Ce que ces kilo-octets achètent est exactement ce qui manque à A : **la hauteur automatique** (`height` omise ⇒ `auto`, [react-pdf.org/components](https://react-pdf.org/components)) et un moteur de layout. Avec pdfkit, un ticket de longueur variable oblige à mesurer le texte à la main pour connaître la hauteur de page — c'est-à-dire à réécrire yoga, moins bien. Et `<Page size={{ width: "80mm" }}>` **écrit la contrainte du domaine littéralement dans le code**, là où pdfkit demande `226.77` — un nombre magique que le prochain lecteur devra re-diviser par 72 pour comprendre.

**Pourquoi pas Chromium.** Il est meilleur sur le papier et perdant sur tout le reste : ~70 Mo, des bibliothèques système absentes d'une image Node slim, `node >= 22.12` contre `>= 20` déclaré par le repo, et surtout — **le repo n'a pas encore de Dockerfile ni de cible de déploiement**. Choisir Chromium maintenant, c'est laisser un ticket de trente lignes décider de l'infrastructure. C'est l'ordre inverse du bon.

**Pourquoi pas satori/PNG.** Un binding natif par plateforme et une sortie rasterisée, pour un document dont la contrainte est une dimension physique. Un PNG ne sait pas qu'il fait 80 mm ; un PDF, si.

**Ce que la décision engage aussi (les corollaires non négociables).**

- **Le provider Resend doit typer son `send()` sur le vrai contrat.** `NotificationData` (`service.ts:13-18`) est un type local qui ne décrit qu'une partie de `ProviderSendNotificationDTO`. Le remplacer par le type du framework — sinon `attachments` restera invisible au compilateur, et le champ est déjà là à l'exécution (§1.1).
- **Le mapping est explicite, pas un spread.** `content_type` → `contentType`, `id` → `contentId`. Un `...attachment` produirait une pièce jointe sans type MIME, que Resend devinerait depuis le nom de fichier (`resend → dist/index.d.mts:610`). Ça marcherait, jusqu'au jour où non.
- **Le subscriber avale ses erreurs**, comme `order-confirmation.ts:113-115`. Une commande payée ne doit jamais échouer parce qu'un PDF n'a pas voulu se générer.
- **Un `idempotency_key`.** Le module le supporte nativement et déduplique dessus (`notification-module-service.js:39-55`), en ne renvoyant que si le statut précédent est `FAILURE` (`:51-55`). `order.placed` peut être rejoué ; le restaurateur ne doit pas recevoir deux tickets. `` `kitchen-ticket:${order.id}` `` est la clé évidente. **Ni le subscriber existant ni le nouveau ne l'utilisent aujourd'hui** — c'est un gain gratuit qui vaut aussi pour l'email client.
- **Le corps de l'email porte le nom, le numéro et le Créneau** (§3). Le créneau se lit dans `order.metadata` (ADR 0004) via le même `query.graph` que le subscriber existant (`order-confirmation.ts:25-54`) : ajouter `"metadata"` à `fields` suffit. Sans ça, le restaurateur doit ouvrir une pièce jointe pour savoir s'il doit courir.

---

## 5. Questions ouvertes et non-vérifiés

**Explicitement non vérifié :**

- ~~**La hauteur automatique de `@react-pdf/renderer`.**~~ **Caduc — voir §6.5.** La lib n'est plus recommandée, et sa hauteur automatique n'a jamais été exécutée. C'est **`pdfmake`** dont la hauteur automatique est désormais **vérifiée par exécution** (§6.3).
- ~~**Les accents dans les polices standard.**~~ **Levé pour le chemin recommandé — voir §6.3.** « Bœuf », ligature comprise, sort intact de `pdfmake` avec la Roboto livrée dans le paquet. La réserve ne vaut plus que pour les **14 polices standard**, qu'on n'utilise pas : la recommandation embarque une TTF, ce qui clôt la question.
- **La largeur imprimable réelle.** 80 mm est la largeur du **papier**. La zone imprimable est plus étroite, d'une valeur qui dépend du modèle — que le repo ne nomme nulle part. **Je n'ai trouvé aucune spécification citable sans connaître l'imprimante.** À mesurer sur place. C'est le seul chiffre de ce document qui ne peut pas venir d'une source écrite.
- **Le comportement de `manager.create` sur une clé inconnue en base réelle.** La lecture du code est nette (MikroORM n'hydrate que `meta.props`, `strict: false` par défaut) mais **aucune requête n'a été exécutée** — pas de base dans cette session. Si l'insertion levait, `createNotifications` échouerait *avant* l'envoi, et le symptôme serait « aucun email », pas « email sans pièce jointe ». Facile à distinguer au premier essai.

**À décider (hors périmètre de cette recherche) :**

- **L'adresse du restaurant : option de module ou variable d'environnement ?** `from` est une option du provider (`medusa-config.ts`, `service.ts:9-10`). Le destinataire de la Notification de commande n'est pas une propriété du *provider* — c'est une propriété du *restaurant*. Le module `pickup` (`apps/backend/src/modules/pickup/models/pickup-config.ts`) tient déjà de la configuration métier éditable sans déploiement ; c'est peut-être là qu'elle vit, pas dans une variable d'environnement.
- **Que met-on sur le ticket, exactement ?** CONTEXT.md § *Ticket cuisine* : nom du client, Créneau, chaque Variante par son nom, chaque Sélection dans une Formule — *« les prix sont permis mais n'ont aucun sens ici »*. Les **Sélections** sont le point dur : le subscriber existant ne lit pas de quoi les reconstituer (`order-confirmation.ts:27-52` prend `items.title`, `items.subtitle`, `items.variant_title` — rien sur les composants d'une Formule). **Savoir où vit une Sélection sur la ligne de commande est un prérequis au ticket**, et cette recherche ne l'a pas traité.
- **Le format du nom de fichier.** `ticket-42.pdf` ou `ticket-2026-07-16-12h15-42.pdf` ? Le restaurateur qui en imprime trente d'affilée les distingue par ce nom. Détail, jusqu'au coup de feu.
- **Faut-il rendre le Ticket cuisine réimprimable depuis l'admin ?** L'email est *« une commodité, pas le registre »* et l'admin est la source de vérité (CONTEXT.md). Aujourd'hui, si l'email n'arrive pas, il n'y a **aucun moyen de récupérer le ticket** — et §1.2 montre que la pièce jointe n'est pas archivée. Une route admin `GET /admin/orders/:id/kitchen-ticket` réutilisant le même composant fermerait la boucle. Hors périmètre, mais c'est le prolongement naturel, et le rendu PDF serait déjà écrit.

---

## 6. Amendement — l'ADR 0002, le PDF actuel, et le renversement de la recommandation

Trois éléments sont arrivés après la rédaction des §1 à §5. Chacun déplace la conclusion ; ensemble, ils la renversent.

### 6.1 L'ADR 0002 a déjà choisi une lib PDF, et ce n'est pas celle-là

> *« We are otherwise following Medusa's official invoice-generator tutorial (**`pdfmake`**, module + subscriber on `order.placed`, admin widget). […] Follow the tutorial for the PDF mechanics. Do not follow it for the lifecycle »*
> — `docs/adr/0002-factures-issued-frozen.md:9-11`

La **Facture** est donc déjà engagée sur **`pdfmake`**, par une décision enregistrée. §2.2 n'a pas évalué pdfmake du tout — l'option manquait au tableau. Recommander `@react-pdf/renderer` pour le Ticket cuisine, c'était condamner le backend à **deux moteurs PDF pour deux documents**, chacun avec sa syntaxe et son arbre de dépendances, sans que personne ne l'ait décidé.

Une objection à écarter tout de suite, parce qu'elle est tentante et fausse. CONTEXT.md dit que la Facture et le Ticket cuisine *« ne sont pas deux rendus d'un même **template** »* (§ *Facture*) — et §4 s'appuyait là-dessus. Mais la phrase interdit de **partager le template**, pas de partager le **moteur de rendu**. Ce sont deux choses distinctes : un cuisinier et un comptable ont besoin de deux documents, pas de deux bibliothèques. **Templates séparés, moteur commun** respecte le domaine à la lettre et n'installe qu'une lib.

### 6.2 Le PDF du système actuel : la hauteur fixe casse déjà, en production

`orecap.pdf` — le document que le restaurant imprime aujourd'hui — est une pièce à conviction sur trois points.

**a) La pagination coupe une ligne de commande en deux.** Sur une commande de **trois lignes**, la dernière déborde en page 2 :

```
page 1 : Nouilles sautées (Choix Nouilles Sautées : Boeuf -     1    14,00 €
page 2 : Assaisonnement : Saté (contient arachide))
```

Le cuisinier lit « Boeuf — » en bas de page 1 et doit **tourner la page pour apprendre que c'est Saté, et que ça contient de l'arachide**. La quantité et le prix restent page 1, l'assaisonnement part page 2. C'est la pire défaillance possible pour un document de production, et c'est un **allergène** qui se retrouve orphelin. §2.1 avançait la hauteur variable comme critère discriminant *théorique* : ce n'est pas théorique, **ça casse déjà, sur une commande de trois lignes**. Toute option qui n'a pas une hauteur automatique reproduira ce bug.

**b) Le document actuel est exactement l'anti-pattern que CONTEXT.md décrit.** Il porte `Email:`, des prix par ligne et un `Total payé 56,50 €` — sur un document que le cuisinier utilise pour cuisiner. C'est *« un document qui servirait à la fois le cuisinier et le comptable »* (CONTEXT.md § *Facture*), et il ne sert bien ni l'un ni l'autre. La glose de CONTEXT.md n'est pas une abstraction : **elle décrit le fichier que le restaurant imprime en ce moment.** Le Ticket cuisine à construire est une *réduction* de ce document, pas un portage.

**c) Trois détails qui informent le template.**
- Le **Créneau** (`Date retrait: 04-07-2026 à 12:15 - 12:30`) est en 4ᵉ ligne, dans la même graisse qu'`Email:`. Or c'est l'information qui ordonne le travail de la cuisine. Sur 80 mm, il doit être en tête et en gras.
- Le texte est **centré** dans une colonne étroite : le bord gauche est en dents de scie, illisible en diagonale pendant un coup de feu. Ferrer à gauche.
- `Téléphone:` est **vide**, alors que CONTEXT.md § *Nom / Email / Téléphone* le décrit comme l'un des trois besoins réels d'une Commande — *« celui dont personne ne voit l'intérêt jusqu'à ce que la cuisine tombe en rupture de bœuf à 12h05 »*. Le champ existait déjà et n'était pas rempli.

**Ce que `orecap.pdf` ne tranche pas** (et que je ne vais pas surinterpréter) : les parenthèses `(Choix Nouilles Sautées : Boeuf - Assaisonnement : Soja)` ressemblent à des **axes d'Options Medusa aplatis dans le titre**, donc à une **Variante** — pas à une **Sélection** dans une Formule (CONTEXT.md § *Variante* : *« en Medusa une Option est l'axe du choix […] et la Variante est la combinaison »*). Aucune Formule n'est visible dans ce document. **La question ouverte de §5 sur les Sélections reste donc entière** — `orecap.pdf` n'y répond pas.

### 6.3 pdfmake fait le 80 mm à hauteur variable — vérifié, pas supposé

La doc pdfmake documente `height: 'auto'` ([pdfmake.github.io/docs/0.1/document-definition-object/page](https://pdfmake.github.io/docs/0.1/document-definition-object/page/)), mais plusieurs issues rapportent que ça tronque le contenu ([#1461](https://github.com/bpampuch/pdfmake/issues/1461), [#2551](https://github.com/bpampuch/pdfmake/issues/2551)) — les deux sont **closes sans résolution visible**. Le point étant le pilier de toute la recommandation, il a été **exécuté** plutôt que cité (spike jetable, hors repo, `pdfmake@0.3.11` sur Node 22.19) :

```js
pageSize: { width: 80 * (72 / 25.4), height: 'auto' }   // 226.77pt
```

| Lignes du ticket | Pages | Page produite |
|---|---|---|
| 3 | **1** | 80,0 × 54,4 mm |
| 25 | **1** | 80,0 × 264,7 mm |
| 60 | **1** | 80,0 × 599,2 mm |

**La largeur reste verrouillée à 80,0 mm, la hauteur suit le contenu, et il n'y a jamais qu'une seule page.** Les PDF ont été relus : le ticket de 60 lignes contient bien ses 60 lignes et son marqueur de fin — **aucune troncature**. Le comportement des issues ne se reproduit pas en 0.3.11 dans cette configuration. C'est très exactement le comportement d'un rouleau — et l'inverse de ce que fait `orecap.pdf` (§6.2a).

**« Bœuf » sort intact**, ligature comprise, avec la police Roboto livrée dans le paquet (`node_modules/pdfmake/fonts/Roboto/`), de même que `sautées`, `Saté`, `€`. **Le non-vérifié n° 2 de §5 est levé** — à la nuance près qu'il l'est pour Roboto embarquée, pas pour les 14 polices standard. (À noter : `orecap.pdf` écrit « Boeuf », jamais « Bœuf ». Le système actuel esquive la ligature ; on n'est pas obligés de reprendre l'esquive.)

### 6.4 Un piège pour l'implémentation de la Facture, trouvé au passage

`pdfmake@0.3.x` **a changé d'API** : `new PdfPrinter(fonts)` — la forme 0.2, celle qu'utilise le tutoriel Medusa que l'ADR 0002 dit de suivre — **n'existe plus** et lève `TypeError: PdfPrinter is not a constructor`. La 0.3 exporte un **singleton** :

```js
const pdfmake = require('pdfmake');
pdfmake.addFonts({ Roboto: { normal: '…/Roboto-Regular.ttf', bold: '…/Roboto-Medium.ttf' } });
const buffer = await pdfmake.createPdf(docDefinition).getBuffer();   // → base64 → Attachment (§1)
```

Le `getBuffer()` alimente directement l'`Attachment` de §1 via `.toString("base64")`. **Ça concerne la Facture autant que le Ticket cuisine** : quiconque suivra le tutoriel à la lettre, comme l'ADR 0002 l'y invite, tombera sur cette erreur au premier `pnpm dev`. Soit on épingle `pdfmake@^0.2`, soit on prend la 0.3 en sachant que le code du tutoriel est à traduire. **Cette décision n'est prise nulle part** et vaut d'être ajoutée à l'ADR 0002.

### 6.5 La recommandation révisée

> **`pdfmake` — le même moteur que la Facture — avec deux templates strictement séparés. Tout le reste de §4 tient.**

Ce qui change par rapport à §4 : **`@react-pdf/renderer` → `pdfmake`**, sur trois arguments.

1. **Une lib au lieu de deux.** L'ADR 0002 impose déjà pdfmake au backend. Le Ticket cuisine peut réutiliser ce moteur sans rien coûter, ou en imposer un second — pour un bénéfice qui a fondu, maintenant que pdfmake est *vérifié* sur la hauteur automatique (§6.3) alors que celle de react-pdf ne l'est *toujours pas*.
2. **L'argument « cohérence React » de §4 est plus faible qu'il n'y paraissait.** Il opposait pdfkit (impératif) à react-pdf (déclaratif, comme react-email). Mais la doc-definition de pdfmake est un objet JSON déclaratif — pas du dessin impératif — et pdfmake calcule le layout lui-même. La distinction qui justifiait le surcoût de yoga-layout ne s'applique pas à pdfmake.
3. **Ce qui reste de §4 est intact** : subscriber distinct, `try/catch` qui avale, `idempotency_key`, mapping snake_case → camelCase dans le provider Resend, corps d'email portant nom/numéro/Créneau. Rien de tout cela ne dépendait de la lib.

**Ce que le template doit faire, de la part d'`orecap.pdf`** : Créneau en tête et en gras · ferré à gauche · pas de prix, pas de `Total payé`, pas d'`Email:` · l'allergène jamais séparé de son plat · le téléphone réellement rempli.

**Le seul non-vérifié qui subsiste sur ce chemin** est celui de §5 qui ne dépend d'aucune lib : **la largeur imprimable réelle** de l'imprimante du restaurant. 80 mm est le papier. Ça se mesure sur place.
