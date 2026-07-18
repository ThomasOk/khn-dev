# 04 — Le ticket cuisine se rend en PDF 80mm, sur une bande continue

**Spec :** [docs/specs/notification-de-commande.md](../../../docs/specs/notification-de-commande.md) — User Stories 2, 3, 4, 5, 6, 7, 13, 14, 19, 21 ; § « Le moteur PDF », § « Le contenu du ticket, informé par `orecap.pdf` », Testing Decisions Seam 1
**ADR :** [0002](../../../docs/adr/0002-factures-issued-frozen.md) — pdfmake déjà choisi pour la Facture, et le piège d'API 0.2→0.3
**Recherche :** [2026-07-16](../../../docs/research/2026-07-16-medusa-notification-commande-ticket-cuisine.md) — §6.3/§6.4 font autorité (API 0.3 vérifiée par exécution)

**Status:** ready-for-agent

**Blocked by:** rien — peut démarrer immédiatement.

**Amendement (2026-07-18) :** ce ticket excluait prix, total et email (acceptance criterion « aucun prix, aucun total »). Sur demande du restaurateur, ces exclusions sont revues — le ticket affiche désormais : le numéro de commande en tête, les labels Client / Téléphone / Email (email du client inclus), un tableau Produit / Qté / Total (chaque ligne portant son propre total TTC), et un Total payé en pied de ticket. Voir l'amendement en tête du spec ; `kitchen-ticket.ts` et son test font foi.

## What to build

Le document que la cuisine lit pendant le coup de feu, rendu en PDF. Pas encore d'email, pas encore de Formule (c'est le ticket 05) : une commande ordinaire produit un ticket imprimable tel quel sur le rouleau 80mm du comptoir.

Le ticket affiche, dans cet ordre : le **Créneau de retrait** en tête, en gras et plus grand que le reste — c'est l'information qui ordonne le travail, et `orecap.pdf` la noyait en 4ᵉ ligne dans la même graisse qu'`Email:`. Puis le **nom du client** et son **téléphone**, de quoi appeler si un plat manque sans ouvrir l'admin. Puis **chaque ligne de commande** : nom de la Variante, quantité, et tout texte d'assaisonnement ou d'allergène **dans le même bloc** — jamais dans une ligne séparée qu'une coupure de page pourrait détacher de son plat. C'est le défaut précis d'`orecap.pdf`, qui sépare déjà « contient arachide » de son plat sur une commande de trois lignes.

Sont **explicitement absents** : email, prix unitaire, total, tout ce qui appartient à la Facture. Un document qui sert à la fois le cuisinier et le comptable ne sert bien ni l'un ni l'autre. Texte **ferré à gauche**, pas centré : le centrage d'`orecap.pdf` fait un bord gauche en dents de scie, illisible en diagonale.

Le moteur est **`pdfmake`, épinglé en `^0.3`** — le même que celui déjà retenu pour la Facture par l'ADR 0002, pour ne pas installer deux bibliothèques PDF pour deux documents. L'épinglage est une exigence à part entière (User Story 21) : un `pnpm add` ultérieur ne doit jamais basculer silencieusement entre l'API 0.2 (`PdfPrinter`) et le singleton 0.3. Le tutoriel Medusa est écrit contre 0.2 ; la traduction vers le singleton est documentée dans l'ADR 0002 amendée.

Un utilitaire partagé rend une `docDefinition` pdfmake en buffer puis en base64. C'est la **seule** pièce commune entre Facture et Ticket cuisine — CONTEXT.md interdit de partager le *template*, pas le moteur. Le template du ticket est une fonction pure qui construit une `docDefinition` (pas un composant React : pdfmake ne rend pas de JSX), testable sans base ni réseau.

## Acceptance criteria

- [x] `pdfmake` est épinglé en `^0.3` dans le `package.json` du backend
- [x] Un utilitaire de rendu partagé rend une `docDefinition` en buffer puis en base64, sans rien savoir du contenu d'un ticket
- [x] Une fonction pure construit la `docDefinition` du ticket depuis une commande — aucune base, aucun réseau, aucun container
- [x] Test unitaire (miroir de `src/lib/slots/__tests__/derive-slots.unit.spec.ts`) : le buffer produit a **une seule page** et une largeur de **226,77pt (80mm)**, lues dans le `/MediaBox` en dur, sans lib supplémentaire
- [x] Test unitaire : la hauteur **grandit** avec le nombre de lignes de commande (ticket à 2 lignes vs ticket à 20 lignes)
- [x] Test unitaire : le texte extrait (via `pdf-parse`, nouvelle devDependency pure JS) contient le nom du client, le Créneau, chaque plat et son allergène, **dans cet ordre**
- [x] ~~Test unitaire : **aucun prix, aucun total** n'apparaît dans le texte extrait~~ — **obsolète depuis l'amendement du 2026-07-18** : remplacé par « shows each line's total in a Produit / Qté / Total table » et « shows the grand total paid »
- [x] Test unitaire : les accents survivent — « Bœuf » dans le texte extrait, ni « Buf » ni un caractère de remplacement
