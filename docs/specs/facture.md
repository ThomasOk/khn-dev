# Facture

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — ce spec ne les rejoue pas :
[ADR 0002](../adr/0002-factures-issued-frozen.md) (la Facture est émise figée et immuable ; compteur séquentiel dédié, sans trou ; format `F-2026-000123`, série remise à zéro chaque année, unicité `(year, number)` ; correction par Avoir manuel ; pdfmake déjà choisi et son piège d'API 0.2→0.3),
[la recherche technique Medusa](../research/2026-07-17-medusa-factures-numerotation-et-pdf.md) (numérotation sans trou, module + Module Link, échafaudage transactionnel `@InjectTransactionManager`, point d'insertion `payment.captured` — toutes les citations de source),
[la recherche légale FR](../research/2026-07-17-obligations-factures-restaurant-france.md) (mentions obligatoires, taux de TVA restauration, conservation 10 ans, e-reporting 2027, inaltérabilité/NF525),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md) (Facture, Numéro de facture, Adresse de facturation, Avoir, Annulation).

> **Avertissement.** La recherche légale est une synthèse de sources publiques officielles, pas un avis juridique. Deux points doivent être validés par le comptable du client **avant mise en production** : (1) le champ d'application de l'obligation d'**inaltérabilité / logiciel de caisse** (CGI 286-I-3° bis, NF525) — voir *Out of Scope* ; (2) le **classement TVA produit par produit**. Ce spec est conçu pour aller déjà dans le sens de l'inaltérabilité, mais ne prétend pas trancher ces deux points.

## Problem Statement

Une commande payée ne produit aujourd'hui aucun document comptable pour le client. `order.placed` déclenche la confirmation client et le Ticket cuisine ; rien ne génère la Facture. Or le client — dont une partie sont des professionnels qui s'en servent pour récupérer la TVA — n'a aucune preuve d'achat détaillée : ni numéro, ni ventilation de TVA, ni adresse de facturation, ni mentions légales.

Et une facture n'est pas un reçu que l'on régénère à volonté. C'est un artefact comptable : son numéro doit être **chronologique et sans trou** (un trou est précisément ce qu'une inspection cherche), et le document ne doit **jamais** changer après émission. Le chemin évident — le tutoriel Medusa officiel de génération de factures — fait exactement l'inverse : il numérote sur `display_id` (troué au moindre rollback de paiement) et régénère le PDF quand la commande change (il réécrit silencieusement un document légal). ADR 0002 a déjà rejeté ce cycle de vie ; il reste à le construire correctement.

Enfin, plusieurs paiements peuvent aboutir à la même seconde pendant un service. Deux Factures qui se voient attribuer le même numéro, ou un numéro sauté parce qu'une transaction a été annulée, sont l'un et l'autre un défaut à conséquences.

## Solution

**Pour le client.** Dès que le paiement d'une commande est encaissé, un email dédié lui parvient — distinct de la confirmation de commande — portant en pièce jointe sa Facture au format PDF. La Facture porte tout ce qu'un professionnel doit y trouver pour récupérer la TVA : identité et identifiants légaux du restaurant, son adresse de facturation à lui, la date, un numéro, le détail des lignes avec prix unitaire HT et taux de TVA par ligne, la ventilation de la TVA par taux, et les totaux HT / TVA / TTC.

**Pour la comptabilité.** Chaque Facture porte un **Numéro de facture** tiré d'un compteur séquentiel dédié : `F-2026-000123`, chronologique, sans trou, remis à zéro au 1ᵉʳ janvier (une série par an, admise par le BOFiP). Le numéro est attribué et la Facture insérée dans **une seule transaction** au moment de l'encaissement : deux paiements simultanés obtiennent deux numéros contigus, jamais le même, et une transaction annulée ne brûle aucun numéro. Une fois émise, la Facture est **figée** — jamais rééditée, jamais régénérée, jamais supprimée. Le PDF est stocké tel quel (les octets, pas la recette qui les a produits) et conservé 10 ans. La seule façon d'annuler une Facture reste l'**Avoir**, écrit à la main (ADR 0002).

**Pour le restaurateur.** Depuis la fiche Commande de l'admin Medusa, il peut retrouver et retélécharger la Facture émise — le même PDF figé, jamais une nouvelle version.

## User Stories

1. En tant que client, je veux recevoir ma Facture par email dès que mon paiement est encaissé, afin d'avoir une preuve d'achat sans avoir à la réclamer.
2. En tant que client professionnel, je veux que la Facture porte le taux et le montant de TVA par ligne et la ventilation par taux, afin de pouvoir récupérer la TVA.
3. En tant que client professionnel, je veux que la Facture porte mon adresse de facturation (celle collectée à la commande), afin qu'elle soit valable comptablement.
4. En tant que client professionnel, je veux que la Facture porte les identifiants légaux du restaurant (raison sociale, adresse, SIREN/SIRET, numéro de TVA intracommunautaire, forme juridique, capital, RCS), afin qu'elle contienne les mentions obligatoires.
5. En tant que client, je veux que la Facture porte un numéro et les dates (émission et vente), afin qu'elle soit identifiable et datée.
6. En tant que client, je veux recevoir la Facture dans un email **distinct** de la confirmation de commande, afin de ne pas confondre l'accusé de réception et le document comptable.
7. En tant que client, je veux que le montant total TTC de la Facture corresponde exactement à ce que j'ai payé, afin qu'il n'y ait aucun écart entre le paiement et le document.
8. En tant que comptable du restaurant, je veux que chaque Facture porte un numéro séquentiel chronologique sans trou, afin d'être conforme à l'obligation de numérotation continue.
9. En tant que comptable, je veux que deux paiements simultanés reçoivent deux numéros différents et contigus, afin qu'il n'y ait jamais de doublon de numéro.
10. En tant que comptable, je veux qu'un paiement dont la transaction est annulée ne consomme aucun numéro, afin qu'aucun trou n'apparaisse dans la séquence.
11. En tant que comptable, je veux que la séquence reparte de 1 chaque année avec l'année dans le numéro, afin de suivre la pratique de série annuelle par exercice.
12. En tant que comptable, je veux qu'une Facture émise ne soit jamais modifiée, régénérée ni supprimée, afin de préserver l'intégrité du document légal.
13. En tant que comptable, je veux que la correction d'une Facture passe par un Avoir et non par une réédition, afin de rester conforme (ADR 0002).
14. En tant que comptable, je veux que les Factures soient conservées 10 ans, afin de couvrir les obligations fiscale (6 ans) et commerciale (10 ans).
15. En tant que restaurateur, je veux retrouver et retélécharger la Facture d'une commande depuis l'admin Medusa, afin de la renvoyer au client sur demande.
16. En tant que restaurateur, je veux que le PDF retéléchargé soit exactement celui émis à l'origine, afin de ne jamais fournir deux versions différentes du même document.
17. En tant que système, je veux émettre la Facture au moment de l'encaissement (`payment.captured`) et non au placement de la commande, afin de ne facturer que ce qui est effectivement payé.
18. En tant que système, je veux que le rejeu de l'événement d'encaissement ne crée pas de seconde Facture ni ne consomme un second numéro, afin de rester idempotent.
19. En tant que système, je veux qu'un échec de rendu PDF, de stockage de fichier ou d'envoi d'email ne « défasse » jamais l'attribution du numéro déjà émis, afin de ne pas rouvrir un trou dans la séquence.
20. En tant que système, je veux que l'échec de la génération de Facture n'empêche pas le Ticket cuisine ni la confirmation client de partir, afin qu'un problème comptable ne bloque pas le service.
21. En tant que restaurateur, je veux que le numéro de TVA appliqué à chaque ligne soit celui calculé par Medusa sur la commande (10 % conso immédiate / 5,5 % conso différée / 20 % alcool), afin que la Facture reflète la fiscalité réelle de la vente.
22. En tant que système, je veux stocker sur la Facture les données figées (`frozen_data`) au moment de l'émission, afin que le document ne dépende plus jamais de l'état mutable de la commande.
23. En tant que futur exploitant, je veux que les données de la Facture soient exportables ventilées par taux de TVA, afin de préparer l'e-reporting B2C obligatoire (échéance PME sept. 2027) sans reconcevoir le modèle.
24. En tant que client, je veux que la Facture soit un PDF simple mais immuable (pas de format structuré imposé en B2C aujourd'hui), afin de pouvoir l'ouvrir et l'archiver sans outil particulier.

## Implementation Decisions

**Un module `invoice` natif Medusa.** Un module custom `invoice` (`apps/backend/src/modules/invoice/`) porte deux data models :
- `Invoice` — les champs figés : `order_id`, `year`, `number` (l'entier séquentiel de l'année), le numéro formaté (`F-2026-000123`), `frozen_data` (JSON, voir plus bas), `file_id` (référence au PDF stocké), et les horodatages. Contrainte d'unicité **`(year, number)`** et **`unique(order_id)`** (idempotence).
- `InvoiceCounter` — une ligne **par année**, `id = "facture-2026"`, `value` entier. Pas de `SEQUENCE`/`SERIAL`/`model.autoincrement()` Postgres : `nextval` n'est pas annulé au rollback et laisserait un trou — l'exact défaut qu'ADR 0002 interdit.

**Attribution atomique du numéro.** Une méthode de service `issueInvoice(order)` fait, dans **une seule transaction** (`@InjectTransactionManager`, voir le complément transactionnel de la recherche technique) : `UPDATE invoice_counter SET value = value + 1 WHERE id = ? RETURNING value` sur la ligne de l'année, puis l'`INSERT` de l'`Invoice` avec le numéro obtenu. Compteur et insert commitent ou rollbackent ensemble : aucun numéro n'est jamais brûlé. Les appels CRUD imbriqués reçoivent le `sharedContext`, sinon une seconde transaction s'ouvrirait et casserait l'atomicité. La méthode est **idempotente sur `order_id`** : appelée deux fois pour la même commande, elle retourne la Facture existante sans consommer de numéro. La sélection de la ligne compteur se fait par **l'année d'émission** (encaissement), qui pour des commandes prépayées du jour est aussi l'année de la commande.

**Pas de Locking Module.** L'option retenue est le compteur par row (l'atomicité vient de SQL, pas d'un verrou applicatif). Le Locking Module de Medusa 2.16 est écarté : son provider par défaut est en mémoire et mono-instance (piège de correction en déploiement multi-instance), et même son provider Postgres n'expose pas l'EntityManager transactionnel au `job`, donc il ne permet pas « verrou + insert dans la même transaction ».

**Point d'insertion : un subscriber sur `payment.captured`.** Un nouveau subscriber (`apps/backend/src/subscribers/`) écoute `payment.captured` — en aval de `auto-capture-payment.ts` — et lance un `issueInvoiceWorkflow`. Pas `order.placed` (l'encaissement n'y est pas encore confirmé) : le Ticket cuisine part au placement, la Facture au paiement. Le subscriber suit la même discipline que `kitchen-ticket-notification.ts` : `try/catch` + `logger.error`, jamais de `throw`, aucun état de commande ne dépend de la réussite de la Facture — un échec comptable ne doit pas empêcher la confirmation client ni le Ticket cuisine.

**Le workflow est un saga, pas une transaction ACID.** `issueInvoiceWorkflow` ne répartit **pas** l'attribution du numéro sur plusieurs steps. Tout le « allouer le numéro + insérer l'`Invoice` » tient dans l'unique appel `issueInvoice`. Les étapes suivantes — rendre le PDF, stocker le fichier, lier à la commande, envoyer l'email — viennent **après**, sont **retriables** et **jamais compensées** : compenser l'attribution rouvrirait un trou. L'émission est donc terminale, non compensable, idempotente. C'est légitime parce que l'encaissement est irréversible (commandes prépayées du jour) : le seul « défaire » d'une Facture est un Avoir.

**Le PDF réutilise le moteur pdfmake, pas le template.** Le rendu passe par la couture existante `renderPdfDocDefinitionToBase64` (`apps/backend/src/lib/pdf/render.ts`) — le seul morceau partagé avec le Ticket cuisine (CONTEXT.md interdit de partager le *template*, pas le *moteur*). Un nouveau template `buildInvoiceDocDefinition` (`apps/backend/src/lib/pdf/`) transforme `frozen_data` en docDefinition. On **stocke les octets** du PDF, jamais le `docDefinition` : le tutoriel Medusa stocke la recette régénérable — rejeté par ADR 0002.

**Stockage du PDF via le File Module + Module Link.** Les octets du PDF sont enregistrés via le File Module de Medusa (`createFiles`, base64, `access: private`) ; `file_id` est conservé sur l'`Invoice`. Un **Module Link** `invoice` ↔ `order` (`apps/backend/src/links/`) relie la Facture à la Commande — pas d'accès cross-module direct. Le provider de fichiers de production dépend de la cible de déploiement, encore indécise (voir *Out of Scope*).

**`frozen_data` — checklist des mentions figées.** Capturé à l'émission, jamais relu depuis la commande ensuite :
- **Émetteur** : raison sociale, adresse, SIREN/SIRET, numéro de TVA intracommunautaire, forme juridique + capital social, ville du RCS.
- **Client** : nom, et Adresse de facturation (le champ `shipping_address` de Medusa, qui n'est jamais une adresse de livraison ici — voir CONTEXT.md).
- **Identité du document** : numéro formaté, date d'émission (= encaissement), date de la vente.
- **Lignes** : pour chaque ligne, désignation, quantité, prix unitaire HT, **taux de TVA de la ligne** et montant de TVA. Le taux et le montant sont ceux **déjà calculés par Medusa** sur la commande (`tax_lines`), pas recalculés ici.
- **Ventilation TVA** : sous-totaux HT, TVA et TTC **par taux**.
- **Totaux** : total HT, total TVA, total TTC (le TTC doit égaler le montant encaissé).

Les valeurs statiques de l'émetteur (SIREN, TVA intracom, capital, RCS…) sont une **configuration du restaurant**, pas des variables d'environnement en dur — résolues à l'émission, dans le même esprit que `restaurant_notification_email` (module `pickup`). Le point d'où provient cette config (réutiliser `pickup`, un nouveau champ, ou un petit modèle dédié) est un choix d'implémentation laissé au ticket ; l'exigence est qu'un changement d'identifiant légal ne demande pas de redéploiement.

**Configuration TVA Medusa — prérequis.** Pour que `tax_lines` porte les bons taux, les trois taux de restauration (10 / 5,5 / 20) doivent être configurés dans le module Tax de Medusa et associés aux produits. Le **classement produit par produit** relève du comptable (⚖️) et n'est pas tranché ici.

## Testing Decisions

Un bon test ici vérifie le **comportement observable et persisté** — ce qui atterrit en base et dans les notifications — jamais les méthodes internes d'un module, l'ordre des steps d'un workflow, ni la forme d'un état interne (AGENTS.md). Trois coutures, validées avec le développeur, du plus haut au plus ciblé :

**Seam 1 — HTTP integration (flux bout-en-bout).** Prior art : `apps/backend/integration-tests/http/kitchen-ticket-notification.spec.ts`. Sur `medusaIntegrationTestRunner` (vrai Postgres jetable), payer un panier via les vraies routes puis, une fois `payment.captured` réglé, asserter le persisté : une `Invoice` liée à la `Commande` par le Module Link, avec un numéro formaté et un `file_id` non nul, un PDF présent dans le File Module, et une notification email au client portant la pièce jointe. Rejouer `payment.captured` : **toujours une seule** `Invoice`, **même** numéro, **aucun** second fichier — l'idempotence, mesurée comme la 2ᵉ moitié du test de non-duplication du ticket cuisine.

**Seam 2 — Module integration (la garantie sans-trou, seam porteur).** `apps/backend/src/modules/invoice/__tests__/*.spec.ts` sur `medusaIntegrationTestRunner`. Appeler `issueInvoice` en parallèle (`Promise.all`) sur N commandes distinctes → les N numéros forment `1..N` **contigus, sans trou, sans doublon**. Appeler `issueInvoice` deux fois sur la même commande → une seule `Invoice`, un seul numéro (idempotence). Émettre sur deux années → deux lignes `InvoiceCounter`, chacune repartant de 1, et `(year, number)` unique. La concurrence ne se teste pas proprement à travers le checkout HTTP complet — d'où ce seam dédié qui appelle le service en parallèle.

**Seam 3 — Unit (fonctions pures).** Prior art : `apps/backend/src/lib/pdf/__tests__/kitchen-ticket.unit.spec.ts` (sous `src/**/__tests__/*.unit.spec.ts`, jamais sous `src/modules/*/__tests__/`). Tester `buildInvoiceDocDefinition` (un `frozen_data` donné → un docDefinition portant les mentions attendues), le calcul de **ventilation TVA par taux** (lignes → sous-totaux par taux, totaux HT/TVA/TTC), et le formateur de numéro (année + entier → `F-2026-000123`, avec le zero-padding).

## Out of Scope

- **Avoir (credit note).** Aucun module, compteur ni UI d'avoir. La correction d'une Facture se fait par un Avoir écrit à la main et classé (ADR 0002). L'annulation d'une commande ne touche pas sa Facture.
- **Inaltérabilité / logiciel de caisse certifié (NF525, ISCA).** ⚖️ Le champ d'application de l'obligation (journal inaltérable, clôtures, attestation éditeur) doit être confirmé par le comptable **avant mise en production** — la source primaire ne confirme pas l'« exemption e-commerce si paiement via Stripe » colportée par la presse. Le présent design va déjà dans le sens de l'inaltérabilité (Facture figée, numéro sans trou, octets stockés, conservation), mais le lot « journal inaltérable + clôtures + attestation » n'est pas construit ici et fera l'objet d'une décision séparée si applicable.
- **Facturation électronique structurée (Factur-X / PDF-A) et e-reporting B2C.** Non requis en B2C aujourd'hui : un PDF immuable simple suffit. L'e-reporting (échéance PME 1ᵉʳ sept. 2027, via Plateforme Agréée) est seulement **anticipé** — `frozen_data` doit rester exportable ventilé par taux — mais rien n'est transmis ni construit maintenant.
- **Classement TVA produit par produit.** ⚖️ Relève du comptable ; ce spec suppose les taux déjà configurés dans le module Tax de Medusa.
- **Provider de fichiers de production.** Le choix dépend de la cible de déploiement encore indécise. Le développement/tests utilisent le provider local du File Module ; le provider de prod est un point de configuration ultérieur.
- **Justification formelle de la série annuelle** et **choix de la Plateforme Agréée** e-reporting — décisions administratives, hors code.

## Further Notes

- **Deux emails au client, par conception.** La confirmation de commande part à `order.placed` (la Facture n'existe pas encore) ; la Facture part à `payment.captured`. Les fusionner obligerait à attendre l'encaissement pour confirmer, ou à joindre un document inexistant. Emails séparés = même discipline « un subscriber par préoccupation » que le Ticket cuisine.
- **Le TTC de la Facture doit égaler le montant encaissé.** C'est l'invariant qui relie le document comptable au paiement réel ; toute divergence est un bug, pas un arrondi à tolérer.
- **La correction d'hypothèse portée par ADR 0002.** La recherche technique du 17/07 tablait sur un compteur unique et `unique(number)`. La contrainte légale de série annuelle l'a corrigée : une ligne compteur **par an**, unicité **`(year, number)`**. L'`UPDATE … RETURNING` atomique est identique — seule la clé de la ligne compteur change (par année).
- **pdfmake est déjà en place.** `render.ts` enregistre les polices Roboto une fois par process et expose `renderPdfDocDefinitionToBase64`. Le piège d'API 0.2→0.3 (`new PdfPrinter` disparu au profit du singleton) est déjà documenté dans ADR 0002 et résolu dans le code existant — le template Facture n'a qu'à produire un docDefinition.
