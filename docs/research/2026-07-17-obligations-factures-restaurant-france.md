# Obligations françaises de facturation — restaurant, vente B2C, click & collect prépayé

**Date** : 2026-07-17
**Statut** : recherche — aucune décision prise. Les « Recommandations » sont écrites pour alimenter une spec fonctionnelle (`docs/specs/`) et compléter l'ADR 0002.
**Périmètre** : Kim-Hi Noodle vend des plats à des **particuliers** (B2C), en **click & collect** (commande en ligne, **paiement en ligne prépayé** via Stripe, **retrait sur place**, aucune livraison). Le restaurant est **assujetti à la TVA** (il facture de la TVA à 10 % / 5,5 % / 20 %).

> ⚠️ **Ceci n'est pas un avis juridique.** C'est une **synthèse de sources publiques officielles** (service-public.fr, impots.gouv.fr, BOFiP, economie.gouv.fr, Legifrance). Chaque affirmation légale est sourcée sur une source primaire. **Un expert-comptable et/ou un avocat doit valider ces conclusions avant la mise en production**, en particulier les points marqués « ⚖️ à valider » — au premier chef l'application de l'**obligation d'inaltérabilité (logiciel de caisse / NF525)** à notre logiciel, qui est le point à la fois le plus lourd et le moins tranché par les sources publiques.

Convention : chaque ligne est étiquetée **[OBLIGATION]** (exigence légale sourcée), **[BONNE PRATIQUE]** (recommandé, non imposé) ou **[⚖️ À VALIDER]** (dépend d'une qualification que seul un comptable/avocat tranche).

---

## TL;DR

1. **Ce que la loi impose au minimum pour un particulier** : une **note** (pas forcément une facture complète) est obligatoire **au-delà de 25 € TTC** ou **sur demande** du client (prestation de services au consommateur). En dessous de 25 € et sans demande : rien d'obligatoire. **[OBLIGATION]**
2. **Ce qu'on recommande de faire quand même** : **émettre systématiquement une facture complète** pour **chaque** commande, quel que soit le montant. C'est la décision déjà prise (CONTEXT.md, ADR 0002), elle **dépasse** le minimum légal, et elle sert les clients professionnels qui récupèrent la TVA. Une facture conforme **couvre aussi** l'obligation de note. **[BONNE PRATIQUE]**
3. **Le ticket de caisse ne nous concerne pas** : depuis le 1ᵉʳ août 2023, il n'est plus imprimé par défaut, remis seulement sur demande. Nos clients reçoivent une **Facture**, pas un ticket de caisse. **[OBLIGATION — sans impact pour nous]**
4. **Numérotation** : numéro **unique, chronologique, continu, sans rupture** (CGI ann. II art. 242 nonies A). La **remise à zéro annuelle est autorisée** via une **série** justifiée par le changement d'exercice (année civile) — format type `F-2026-000123`. Cela **change la contrainte d'unicité en base** : `unique(année, numéro)`, pas `unique(numéro)`. **[OBLIGATION + choix de format = BONNE PRATIQUE]**
5. **Conservation** : **6 ans** (fiscal, LPF art. L102 B) et **10 ans** (commercial, C. com. art. L123-22) → **garder 10 ans**. **[OBLIGATION]**
6. **Inaltérabilité / logiciel de caisse (CGI art. 286-I-3° bis, dispositif NF525)** : notre logiciel enregistre des **encaissements de particuliers assujettis à la TVA** → il **tombe très probablement dans le champ** de l'obligation d'inaltérabilité (conditions **ISCA** : Inaltérabilité, Sécurisation, Conservation, Archivage). L'« exemption e-commerce si paiement par PSP » qui circule dans la presse spécialisée **n'est pas confirmée par la source primaire** (impots.gouv.fr : l'obligation s'applique « quel que soit le mode de règlement »). **[⚖️ À VALIDER — point critique]**
7. **Facturation électronique 2026-2027** : réforme e-invoicing (B2B) + **e-reporting** (B2C). Pour nous (B2C, PME) : pas de facture Factur-X à envoyer au client, mais un **e-reporting** des données de transaction B2C à transmettre à la DGFiP via une **Plateforme Agréée**, **obligatoire à partir du 1ᵉʳ septembre 2027**. À **concevoir pour**, pas à construire maintenant. **[OBLIGATION future]**
8. **Forme du PDF** : **aucune obligation** aujourd'hui d'un format structuré (Factur-X) ou PDF/A pour une facture B2C. Un **PDF immuable simple suffit**. Le délivrer par **e-mail (pièce jointe)** + le rendre **disponible sur demande/téléchargement**. **[OBLIGATION (délivrance) + BONNE PRATIQUE (canal)]**

---

## Recommandations pour notre cas

| # | Décision | Recommandation | Base / source | Statut |
|---|---|---|---|---|
| 1 | Document émis au client | **Émettre systématiquement une Facture complète** (couvre la note) | Note obligatoire >25 € ou sur demande (Arrêté 8 juin 1967 ; Arrêté n°83-50/A ; service-public F23208) — on fait mieux | OBLIGATION (note) + **BONNE PRATIQUE** (facture systématique) |
| 2 | Ticket de caisse | **Ne pas en produire** ; le client a sa Facture | Fin de l'impression systématique au 1ᵉʳ août 2023 (loi AGEC ; info.gouv.fr) | OBLIGATION — sans impact |
| 3 | Mentions de la Facture | Checklist complète `frozen_data` (voir §2) | CGI art. 289 & ann. II 242 nonies A ; C. com. L441-9 ; service-public F31808 | **OBLIGATION** |
| 4 | Taux de TVA par ligne | Classer chaque produit : **10 %** (à emporter conso immédiate), **5,5 %** (conservable/différé), **20 %** (alcool) | BOI-ANNX-000495 ; BOI-TVA-LIQ-30-10-10 | OBLIGATION + **⚖️ classement à valider** |
| 5 | Format du numéro | `F-2026-000123` — préfixe année + séquence zéro-paddée | CGI ann. II 242 nonies A ; BOI-TVA-DECLA-30-20-20-10 §90-110 | OBLIGATION (règle) + BONNE PRATIQUE (format) |
| 6 | Remise à zéro annuelle | **Oui** — série par année (justifiée par changement d'exercice) → contrainte **`unique(année, numéro)`** | Même source, §100 (séries distinctes) | **⚖️ à faire bénir par le comptable**, mais admis |
| 7 | Conservation | **Archiver 10 ans** (couvre 6 ans fiscal + 10 ans commercial) | LPF L102 B (6 ans) ; C. com. L123-22 (10 ans) | **OBLIGATION** |
| 8 | Inaltérabilité / NF525 | Traiter le logiciel comme **dans le champ** ISCA → prévoir une **attestation individuelle d'éditeur** (rétablie par la LF 2026) ; notre design *issued & frozen* + compteur *gapless* y prépare déjà | CGI 286-I-3° bis ; impots.gouv.fr (champ d'application) ; economie.gouv.fr | **⚖️ À VALIDER — critique** |
| 9 | e-reporting B2C | **Concevoir pour** : pouvoir exporter/transmettre les données de transaction B2C via une Plateforme Agréée. Échéance PME : **1ᵉʳ sept. 2027** | economie.gouv.fr (calendrier) | OBLIGATION future |
| 10 | Forme du PDF | **PDF immuable simple** (pas de Factur-X/PDF/A imposé en B2C aujourd'hui) | Réforme e-facture = e-reporting côté B2C, pas facture structurée au client | BONNE PRATIQUE |
| 11 | Délivrance au client | **PDF en pièce jointe de l'e-mail** de confirmation + **disponible au téléchargement** | Note/facture doit être *délivrée* (Arrêté 8 juin 1967) | OBLIGATION (délivrance) + BONNE PRATIQUE (canal) |

---

## 1. Facture vs note vs ticket de caisse — que doit-on émettre ?

### 1.1 Les trois documents et leur régime

- **La facture** est **obligatoire pour toute vente ou prestation entre professionnels** (B2B). Pour un **particulier** (B2C), elle **n'est pas obligatoire par principe**, sauf **sur demande du client** ou pour certaines opérations (vente à distance, travaux immobiliers…). — service-public *Tout savoir sur la facturation* (F23208).
- **La note** est le document que remet un professionnel à un **consommateur** pour une **prestation de services**. Elle est **obligatoire dès que le montant dépasse 25 € TTC**, ou **quel que soit le montant si le client la demande**. Base : Arrêté n°83-50/A du 3 octobre 1983 (prestations de services au consommateur), et, pour la restauration/hôtellerie spécifiquement, l'**Arrêté du 8 juin 1967** (JORFTEXT000000827291) : la note doit être établie **en double exemplaire**, **datée**, porter la **raison sociale et l'adresse** de l'établissement, et détailler **séparément les prix TTC de chaque prestation**.
- **Le ticket de caisse** (reçu de caisse) : depuis le **1ᵉʳ août 2023** (loi AGEC du 10 février 2020, initialement prévue au 1ᵉʳ janvier 2023 puis reportée deux fois), il **n'est plus imprimé automatiquement** ; il est **remis uniquement sur demande** du client. — info.gouv.fr, *Le ticket de caisse remis sur demande dès le 1ᵉʳ août 2023*.

### 1.2 Notre cas

La restauration à emporter est une **prestation/vente à un consommateur**. Le minimum légal serait donc : **une note au-delà de 25 € TTC ou sur demande**, rien en dessous sans demande.

**Recommandation** : émettre **systématiquement une Facture complète** pour **chaque** commande, quel que soit le montant. C'est déjà la décision du domaine (CONTEXT.md § *Facture*, ADR 0002). Justification :

- Une **facture conforme couvre a fortiori l'obligation de note** (elle contient tout ce que la note exige, et plus).
- CONTEXT.md le dit : « certains clients sont des professionnels qui récupèrent la TVA » → ils **ont besoin** d'une facture nominative, pas d'une note.
- Le coût marginal est nul : le système génère de toute façon un document par commande prépayée.

Le **ticket de caisse ne nous concerne pas** : le client reçoit une **Facture** (le domaine l'a déjà acté — CONTEXT.md § *Ticket cuisine* : « le client ne reçoit jamais de ticket de caisse, il reçoit une Facture »). Rien à imprimer ni à proposer côté ticket de caisse.

> **[BONNE PRATIQUE]** Facture systématique. **[OBLIGATION]** Note ≥ 25 € / sur demande — satisfaite par la facture. **[OBLIGATION sans impact]** Ticket de caisse sur demande — non applicable.

---

## 2. Mentions obligatoires & TVA — checklist pour `frozen_data`

### 2.1 Mentions obligatoires d'une facture (sources : CGI art. 289 & ann. II art. 242 nonies A ; C. com. art. L441-9 ; service-public F31808 ; economie.gouv.fr)

**Émetteur (le restaurant) :**
- [ ] Dénomination sociale / raison sociale
- [ ] Adresse du siège social
- [ ] **SIREN / SIRET**
- [ ] Forme juridique et **capital social** (si société)
- [ ] Numéro **RCS** + ville du greffe (commerçant) ou n° au **Répertoire des métiers** le cas échéant
- [ ] **Numéro de TVA intracommunautaire** (obligatoire dès que la facture ≥ 150 € HT, en pratique toujours pour un assujetti — le mettre systématiquement)

**Destinataire (le client) :**
- [ ] Nom du client
- [ ] **Adresse de facturation** (CONTEXT.md § *Adresse de facturation* : c'est le champ Medusa `shipping_address`, jamais une adresse de livraison)
- [ ] (Si client professionnel : son adresse, et son SIREN à partir de la réforme e-facture — cf. §5)

**Document :**
- [ ] **Date d'émission** de la facture
- [ ] **Numéro unique** (séquence chronologique continue — cf. §3)
- [ ] **Date de la vente / de la prestation** (ici : date de la commande / du Créneau de retrait)

**Lignes & montants :**
- [ ] Pour chaque ligne : **désignation précise** du produit (la Variante par son nom), **quantité**, **prix unitaire HT**
- [ ] **Taux de TVA** applicable **par ligne** (cf. §2.2)
- [ ] **Montant de TVA par taux** (ventilation des différents taux)
- [ ] **Total HT**, **total TVA**, **total TTC**
- [ ] Réduction / remise éventuelle (sans objet aujourd'hui — pas de supplément ni de remise, CONTEXT.md § *Supplément*)

**Mentions B2B (non requises en B2C, mais sans danger si présentes) :** conditions de règlement, date de paiement, taux des **pénalités de retard**, mention de l'**indemnité forfaitaire de 40 €** pour frais de recouvrement, escompte. Nos commandes étant **prépayées**, le règlement est immédiat : on peut mentionner « Payé le [date] par carte » plutôt que des conditions de paiement.

> Note : la mention *« TVA non applicable, art. 293 B du CGI »* concerne la franchise en base — **pas notre cas** (le restaurant facture de la TVA).
> Note : la mention de la **garantie légale de conformité (2 ans)** ne vise que certaines catégories de **biens durables** (électroménager, informatique…) — **sans objet pour de la nourriture**.

### 2.2 Les taux de TVA applicables (le vrai piège) — [OBLIGATION + ⚖️ classement à valider]

Sources : BOI-TVA-LIQ-30-10-10 ; **tableau récapitulatif BOI-ANNX-000495** (« ventes à emporter ou à livrer de produits alimentaires préparés en vue d'une consommation immédiate »).

La vente à emporter / click & collect suit une règle **produit par produit** :

| Situation | Taux | Exemples |
|---|---|---|
| Produit alimentaire préparé, **consommation immédiate** (à emporter) | **10 %** | Plat chaud à emporter, samoussas prêts à manger, boisson en gobelet |
| Produit alimentaire **conservable / consommation différée** | **5,5 %** | Aliment vendu dans un conditionnement permettant la conservation (bouteille/canette, produit sous vide) |
| **Boissons alcooliques** | **20 %** | Vin, bière (bière ≤ 0,5 % d'alcool = 5,5 %) |

**Conséquence pour nous** : une même commande peut mélanger **plusieurs taux** (un plat à 10 %, une canette à 5,5 %, un verre de vin à 20 %). La Facture doit donc **ventiler la TVA par taux**, et **chaque Variante de la Carte doit porter son taux de TVA**. Le **classement de chaque produit** (immédiat vs différé, notamment pour les boissons) est une **qualification fiscale** que le restaurateur et son comptable doivent arrêter — ce n'est pas au logiciel de la deviner.

> **[⚖️ À VALIDER]** Le taux exact par produit (surtout boissons non alcoolisées : 10 % ou 5,5 % selon le contenant). Le système doit **stocker un taux par Variante**, pas le coder en dur.

---

## 3. Numérotation — chronologique, continue, remise à zéro annuelle ?

### 3.1 La règle

**CGI, annexe II, article 242 nonies A (I-7°)** (texte en vigueur, Legifrance LEGIARTI000050811276) :

> « Un **numéro unique basé sur une séquence chronologique et continue** ; la numérotation **peut être établie dans ces conditions par séries distinctes lorsque les conditions d'exercice de l'activité de l'assujetti le justifient** ; l'assujetti doit faire des séries distinctes un usage conforme à leur justification initiale. »

Le **BOFiP** (BOI-TVA-DECLA-30-20-20-10, §90 à §110) précise : la numérotation doit être **chronologique** (au fil de l'émission) et **continue** (sans rupture) **au sein de chaque série**, avec un **système garantissant que deux factures émises la même année ne portent pas le même numéro**. Il **recommande un préfixe distinct par série** pour éviter toute confusion.

### 3.2 La remise à zéro annuelle est-elle permise ?

**Oui.** Le **changement d'exercice** (année civile) est **une justification admise** de série distincte (BOFiP §100 ; confirmé par la doctrine comptable). Concrètement : si l'exercice suit l'année civile, on **peut repartir à 1** à la première facture de l'année, **à condition** que, **dans l'année**, la séquence reste chronologique, continue et sans trou, et que deux factures de la même année ne portent pas le même numéro.

Un **compteur continu à vie** (jamais remis à zéro) est **également conforme** et plus simple. Les deux options sont légales.

### 3.3 Recommandation

- **Format** : **`F-2026-000123`** — préfixe `F` (facture) + **année** (la « série ») + **séquence zéro-paddée** repartant à 1 chaque année.
- **Remise à zéro annuelle : oui**, l'année servant de série (pratique comptable française standard, garde des numéros courts et lisibles).
- **Impact base de données — important** : cela **modifie la contrainte d'unicité** posée dans la recherche technique du 2026-07-17. Le compteur devient **par année** (clé = l'année), et l'unicité porte sur le **couple** :
  - `unique(année, numéro)` **au lieu de** `unique(numéro)`,
  - `formatted_number` (`F-2026-000123`) reste globalement `unique`.
- La garantie *gapless* **par année** reste assurée par le mécanisme déjà conçu (ligne compteur + `UPDATE … RETURNING` atomique), simplement **une ligne compteur par année** (`id = "facture:2026"`), ou une colonne `year` sur la ligne compteur.

> **[OBLIGATION]** numéro unique, chronologique, continu, sans trou. **[BONNE PRATIQUE / ⚖️]** format `F-AAAA-NNNNNN` avec reset annuel — à confirmer avec le comptable (choix de série), mais explicitement admis par le BOFiP.

---

## 4. Conservation, archivage & inaltérabilité (le point critique)

### 4.1 Durée de conservation — [OBLIGATION]

- **Fiscal** : **6 ans** à compter de la dernière opération, pour présentation à l'administration (**LPF art. L102 B**).
- **Commercial** : **10 ans** (documents comptables et pièces justificatives, **C. com. art. L123-22** et L110-4).

**Recommandation** : **archiver les factures 10 ans** — cela couvre les deux délais. Notre design (octets PDF + `frozen_data` stockés durablement) le permet nativement ; il faut juste garantir que le stockage (File Module / S3) a une **rétention ≥ 10 ans** et n'est pas purgé.

### 4.2 Inaltérabilité — loi anti-fraude TVA / « logiciel de caisse » (ISCA / NF525) — [⚖️ À VALIDER — CRITIQUE]

**La règle.** **CGI art. 286-I-3° bis** (loi de finances 2016, en vigueur depuis le 1ᵉʳ janvier 2018) impose à tout **assujetti à la TVA** qui **enregistre les règlements de ses clients** au moyen d'un **logiciel ou système de caisse** d'utiliser un logiciel satisfaisant aux conditions **ISCA** : **I**naltérabilité, **S**écurisation, **C**onservation, **A**rchivage — attesté soit par un **certificat** d'organisme accrédité (**NF525** délivré par AFNOR/Infocert, ou LNE), soit par une **attestation individuelle de l'éditeur**.

**Le champ d'application (source primaire, impots.gouv.fr, FAQ *« Quel est le champ d'application de l'obligation de détenir un logiciel de caisse sécurisé ? »*) :**
- L'obligation vise les assujettis qui **enregistrent les paiements de clients particuliers** (non assujettis) via un logiciel de caisse, **quel que soit le secteur** ;
- **Le e-commerce s'adressant à des clients non assujettis (particuliers) est explicitement concerné** ;
- **Le mode de règlement n'exonère pas** : l'obligation s'applique « quel que soit le mode de règlement (espèces, chèques, CB, virements, prélèvement) » ;
- **Exemptions** : (a) assujettis réalisant **l'intégralité** de leurs opérations **avec des professionnels** (B2B, car facturation obligatoire) ; (b) **franchise en base de TVA** / micro non assujetti ; (c) opérations **exclusivement exonérées** de TVA.

**Notre situation.** Kim-Hi Noodle : **assujetti à la TVA**, **vend à des particuliers**, **enregistre les règlements** (le système Medusa enregistre la commande payée). Aucune des trois exemptions ne s'applique (on n'est ni B2B-only, ni en franchise, ni exonéré). **→ Notre logiciel tombe très probablement dans le champ de l'obligation d'inaltérabilité.**

**Le piège de l'« exemption e-commerce ».** Plusieurs sources **secondaires** (éditeurs de logiciels, cabinets) affirment qu'un site e-commerce qui n'encaisse **que** par un **PSP conforme** (Stripe, Adyen…) serait **dispensé** de NF525, les flux étant déjà tracés par le système bancaire. **Cette exemption n'est PAS confirmée par la source primaire** : la FAQ impots.gouv.fr dit au contraire que l'obligation s'applique **« quel que soit le mode de règlement »** et que **c'est l'enregistrement des ventes qui est visé, pas le paiement lui-même**. Le fait que Stripe encaisse ne retire donc pas, en lecture littérale, l'obligation portant sur **le logiciel qui enregistre la vente** (Medusa). **Il y a ici un vrai désaccord entre presse spécialisée et texte administratif → validation comptable/avocat indispensable.**

**Loi de finances 2026** : elle **rétablit la possibilité de l'attestation individuelle par l'éditeur** du logiciel (en complément de la certification NF525/LNE). Comme **nous éditons notre propre logiciel** (Medusa custom), la voie réaliste serait **l'auto-attestation éditeur** plutôt qu'une certification NF525 externe — **si** l'obligation nous est bien applicable.

**Sanction** : amende de **7 500 € par logiciel** non conforme + mise en conformité sous 60 jours (economie.gouv.fr).

**Bonne nouvelle : notre design y prépare déjà.** L'ADR 0002 (Facture *issued & frozen*, jamais éditée/supprimée/régénérée) + le compteur **gapless** + le stockage des **octets** figés + l'**archivage** correspondent exactement à l'esprit d'ISCA (Inaltérabilité, Sécurisation, Conservation, Archivage). Ce qui manque n'est **pas** technique mais **formel** : produire et conserver une **attestation** (auto-attestation éditeur) documentant que le logiciel respecte ISCA, et probablement des **fonctions de clôture/journalisation** (grand livre inaltérable des encaissements, données de clôture périodiques) que NF525 attend d'un système de caisse.

> **[⚖️ À VALIDER — priorité 1]** (1) Notre logiciel est-il qualifié de « système de caisse » au sens de 286-I-3° bis ? (2) Si oui, auto-attestation éditeur suffisante ? (3) Quelles fonctions ISCA additionnelles (journal inaltérable, clôtures, données d'archivage) faut-il implémenter au-delà de la Facture figée ? **Ce sont les questions à poser au comptable en premier**, car elles peuvent ajouter du périmètre.

---

## 5. Facturation électronique & e-reporting (réforme 2026-2027) — [OBLIGATION future]

Sources : economie.gouv.fr *Tout savoir sur la facturation électronique* ; service-public.

**La réforme** distingue :
- **e-invoicing** : factures électroniques structurées (Factur-X, UBL, CII) entre **assujettis** (B2B domestique), transitant par des **Plateformes Agréées (PA)** ;
- **e-reporting** : **transmission à la DGFiP des données de transactions non couvertes par l'e-invoicing** — notamment les **ventes aux particuliers (B2C)** et les exports.

**Calendrier (dates officielles) :**
- **1ᵉʳ septembre 2026** : **toutes** les entreprises doivent pouvoir **recevoir** des factures électroniques ; les **grandes entreprises et ETI** doivent **émettre** et faire de l'**e-reporting**.
- **1ᵉʳ septembre 2027** : obligation d'**émission** + **e-reporting** étendue à **toutes** les entreprises, y compris **PME et micro-entreprises**.

**Notre cas (B2C, PME/petite structure) :**
- Nos clients étant des **particuliers**, on **n'émet pas** de facture Factur-X *au client* : le B2C relève de l'**e-reporting**, c'est-à-dire **transmettre les données de transaction B2C** (montants, TVA…) à la DGFiP **via une Plateforme Agréée**.
- **Échéance qui nous concerne : 1ᵉʳ septembre 2027** (PME/micro).
- Dès **septembre 2026**, il faut au minimum pouvoir **recevoir** une facture électronique (côté achats du restaurant — hors périmètre de notre logiciel de vente).

**Recommandation** : **concevoir pour, ne pas construire maintenant.** Prévoir dès aujourd'hui que le module `invoice` / la commande puisse **exporter proprement les données de transaction B2C** (agrégées par période, par taux de TVA) vers un format transmissible à une PA. Ne pas coder l'intégration PA tant que le choix de plateforme et les spécifications techniques finales ne sont pas arrêtés. **Le choix de la Plateforme Agréée et le raccordement sont à trancher avec le comptable avant septembre 2027.**

> **[OBLIGATION future — sept. 2027]** e-reporting B2C via PA. **[BONNE PRATIQUE — maintenant]** garder les données de transaction exportables et bien ventilées par taux de TVA.

---

## 6. Forme du PDF & délivrance au client

### 6.1 Forme — [pas d'obligation de format structuré aujourd'hui en B2C]

Il **n'existe aujourd'hui aucune obligation** qu'une facture **B2C** soit au format **Factur-X** ou **PDF/A**. L'exigence de **format structuré** relève de la **réforme e-invoicing B2B** (§5) — et pour le B2C, la réforme se traduit par de l'**e-reporting de données**, **pas** par une facture structurée remise au client. **Un PDF immuable « simple » est donc parfaitement suffisant** pour la facture remise au particulier.

Cela **conforte** le design déjà retenu (ADR 0002 + recherche technique) : rendre le PDF **une fois** via `pdfmake`, **stocker les octets** figés, ne jamais régénérer. Aucune contrainte de format structuré à ajouter aujourd'hui.

> Remarque : passer plus tard à un PDF **Factur-X** (PDF/A-3 + XML embarqué) serait une évolution utile le jour où on voudra servir aussi des **clients professionnels** dans le cadre e-invoicing — mais ce n'est **pas** requis pour le B2C et ce n'est **pas** à faire maintenant.

### 6.2 Délivrance — [OBLIGATION de délivrance + BONNE PRATIQUE de canal]

La note/facture doit être **délivrée** au client (Arrêté 8 juin 1967 : note remise au client ; facture remise sur demande). Aucune règle n'impose un **canal** précis (papier, e-mail, lien) — l'e-mail est admis.

**Recommandation** :
- **Joindre le PDF de la Facture en pièce jointe** de l'**e-mail de confirmation** envoyé au client (symétrique du Ticket cuisine joint à la Notification de commande côté restaurateur). C'est le canal le plus sûr : le client **reçoit** effectivement son document.
- **Et** le rendre **disponible au téléchargement** (route authentifiée / lien signé vers le File Module), pour réémission et pour le client qui a perdu l'e-mail.
- Le restaurateur doit pouvoir **rééditer** la Facture (réimpression) depuis l'admin — le PDF étant figé, « rééditer » = **re-servir les mêmes octets**, jamais régénérer.

> **[OBLIGATION]** la Facture doit être délivrée. **[BONNE PRATIQUE]** e-mail (pièce jointe PDF) **+** disponibilité au téléchargement/sur demande.

---

## 7. Questions ouvertes / à valider par un comptable ou un avocat

1. **⚖️ CRITIQUE — Inaltérabilité / logiciel de caisse (§4.2).** Notre logiciel est-il un « système de caisse » au sens de CGI 286-I-3° bis ? Si oui : (a) l'**auto-attestation éditeur** suffit-elle ? (b) quelles **fonctions ISCA** (journal inaltérable des encaissements, clôtures journalières/mensuelles/annuelles, données d'archivage figées) faut-il ajouter **au-delà** de la Facture figée ? C'est le point qui peut **élargir le périmètre technique** — à traiter en premier.
2. **⚖️ Fiabilité de l'« exemption e-commerce par PSP ».** La source primaire (impots.gouv.fr) contredit la presse spécialisée. Faire trancher : le recours à Stripe nous exonère-t-il, oui ou non ?
3. **⚖️ Taux de TVA par produit (§2.2).** Classement immédiat/différé de chaque Variante, en particulier les boissons non alcoolisées (10 % vs 5,5 % selon le contenant). À arrêter produit par produit.
4. **⚖️ Série / remise à zéro annuelle (§3).** Confirmer le choix `unique(année, numéro)` et le format `F-2026-000123` avec le comptable (documenter la justification de série).
5. **e-reporting B2C (§5).** Choix de la **Plateforme Agréée** et modalités de raccordement, avant le 1ᵉʳ septembre 2027.
6. **Adresse de facturation optionnelle ?** CONTEXT.md dit qu'un particulier peut commander en invité et que l'adresse de facturation sert surtout aux pros qui récupèrent la TVA. Vérifier si l'**adresse client** peut manquer sur la facture d'un pur particulier (pour une facture B2C de faible montant, le nom peut suffire ; une facture pour un professionnel exige nom **et** adresse). À cadrer dans la spec du checkout.

---

## 8. Décisions débloquées pour la spec

1. **Document émis** : **Facture complète systématique** pour chaque commande (dépasse le minimum « note ≥ 25 € / sur demande » et le couvre). **Pas** de ticket de caisse.
2. **Format du numéro** : **`F-2026-000123`** (préfixe `F` + année + séquence zéro-paddée).
3. **Remise à zéro annuelle : OUI** (série = année). → **Contrainte DB `unique(année, numéro)`** (refonte du `unique(number)` de la recherche technique) ; **une ligne compteur par année** ; `formatted_number` reste `unique`. *(à faire bénir par le comptable, mais admis par le BOFiP)*
4. **Champs `frozen_data`** (checklist §2.1) : émetteur (dénomination, adresse, SIREN/SIRET, forme + capital, RCS, **TVA intracom**) ; client (nom, adresse de facturation) ; document (date d'émission, numéro, date de vente/créneau) ; lignes (désignation, quantité, PU HT, **taux de TVA par ligne**) ; **ventilation TVA par taux** ; totaux HT / TVA / TTC ; mention « Payé le … par carte ». **Chaque Variante porte son taux de TVA** (10 / 5,5 / 20 %).
5. **Délivrance** : **PDF joint à l'e-mail de confirmation client** + **disponible au téléchargement / réémission** (re-service des octets figés, jamais régénérés).
6. **Conservation** : **archivage 10 ans** (rétention du stockage à garantir).
7. **Forme du PDF** : **PDF immuable simple** — **pas** de Factur-X / PDF/A imposé en B2C aujourd'hui. Design `pdfmake` + octets figés inchangé.
8. **Inaltérabilité / NF525** : **traiter le logiciel comme dans le champ ISCA** ; viser une **auto-attestation éditeur** (LF 2026) ; le design *issued & frozen* + compteur *gapless* + archivage y prépare — **mais périmètre ISCA additionnel à confirmer avec le comptable (point n°1 des questions ouvertes)**.
9. **e-reporting B2C à concevoir pour** : garder les **données de transaction B2C exportables et ventilées par taux de TVA** ; intégration à une **Plateforme Agréée** à livrer avant le **1ᵉʳ septembre 2027**, pas maintenant.

---

## 9. Sources

**Repo :**
- `CONTEXT.md` §§ *Facture*, *Facture — issued and frozen*, *Numéro de facture*, *Avoir*, *Adresse de facturation*, *Ticket cuisine*, *Supplément*.
- `docs/adr/0002-factures-issued-frozen.md`.
- `docs/research/2026-07-17-medusa-factures-numerotation-et-pdf.md` (design technique — cette note en fixe les paramètres légaux, notamment la contrainte d'unicité annuelle).

**Sources officielles primaires (web) :**
- service-public / entreprendre — *Tout savoir sur la facturation* : https://entreprendre.service-public.gouv.fr/vosdroits/F23208 (facture obligatoire B2B ; note ≥ 25 € ou sur demande en B2C ; conservation 10 ans / 6 ans fiscal).
- service-public / entreprendre — *Mentions obligatoires sur une facture* : https://www.service-public.gouv.fr/entreprendre/vosdroits/F31808.
- economie.gouv.fr — *Factures : mentions obligatoires* : https://www.economie.gouv.fr/entreprises/factures-mentions-obligatoires.
- Legifrance — **CGI annexe II, art. 242 nonies A** (numéro unique, séquence chronologique et continue, séries distinctes) : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000050811276.
- BOFiP — **BOI-TVA-DECLA-30-20-20-10** (mentions obligatoires générales ; numérotation ; séries §90-110) : https://bofip.impots.gouv.fr/bofip/140-PGP.html/identifiant=BOI-TVA-DECLA-30-20-20-10-20131018.
- BOFiP — **BOI-ANNX-000495** (tableau des taux TVA ventes à emporter / consommation immédiate) : https://bofip.impots.gouv.fr/bofip/7204-PGP.html/identifiant=BOI-ANNX-000495-20240207.
- BOFiP — **BOI-TVA-LIQ-30-10-10** (taux réduits produits alimentaires) : https://bofip.impots.gouv.fr/bofip/2033-PGP.html/identifiant=BOI-TVA-LIQ-30-10-10-20241009.
- info.gouv.fr — *Le ticket de caisse remis sur demande dès le 1ᵉʳ août 2023* : https://www.info.gouv.fr/actualite/le-ticket-de-caisse-remis-sur-demande-du-consommateur-des-le-1er-aout-2023.
- Legifrance — **Arrêté du 8 juin 1967** (délivrance d'une note dans hôtels/restaurants) : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000827291.
- impots.gouv.fr — FAQ **champ d'application de l'obligation de logiciel de caisse sécurisé** (e-commerce B2C concerné ; « quel que soit le mode de règlement » ; exemptions B2B-only / franchise / exonéré) : https://www.impots.gouv.fr/professionnel/questions/quel-est-le-champ-dapplication-de-lobligation-de-detenir-un-logiciel-de.
- economie.gouv.fr — *Ce qu'il faut savoir sur la certification des logiciels de caisse* (NF525/LNE, attestation éditeur, sanctions) : https://www.economie.gouv.fr/entreprises/gerer-son-entreprise-au-quotidien/gerer-sa-comptabilite-et-ses-demarches/ce-quil-faut-savoir-sur-la-certification-des-logiciels-de-caisse *(page renvoyant un 403 à la récupération automatique le 2026-07-17 ; contenu confirmé via cache de recherche — à revérifier).*
- economie.gouv.fr — *Tout savoir sur la facturation électronique pour les entreprises* (calendrier 2026/2027, e-reporting B2C, Plateformes Agréées) : https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises.

**Textes cités (références à vérifier au texte par le comptable/avocat) :**
- **CGI art. 289** (obligation et contenu de la facture), **art. 286-I-3° bis** (inaltérabilité / logiciel de caisse), **art. 293 B** (franchise en base — hors sujet ici).
- **C. com. art. L441-9** (mentions de facture entre professionnels), **art. L123-22** (conservation comptable 10 ans).
- **LPF art. L102 B** (conservation fiscale 6 ans).
- **Arrêté n°83-50/A du 3 octobre 1983** (note de prestation de services au consommateur ≥ 25 €).
- **Loi AGEC n°2020-105 du 10 février 2020** (fin de l'impression systématique du ticket de caisse).
- **Loi de finances 2026** (rétablissement de l'attestation individuelle d'éditeur pour les logiciels de caisse).
