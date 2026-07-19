# 08 — Les garde-fous

**What to build:** Trois règles muettes qui bornent une route publique sans compte, **sans ajouter le moindre état** à la Réservation (ADR 0008). Elles arrivent avant le formulaire storefront : on n'expose pas une route publique de création sans limite de fréquence.

La plus importante n'est pas l'anti-fraude, c'est **une seule Réservation active par email et par Service**. Le cas malveillant — un concurrent qui remplit le samedi soir — est rare ; le cas bête est certain : le client qui valide deux fois, ou qui rafraîchit, et qui bloque huit Couverts au lieu de quatre. La règle transforme un double-clic en refus propre au lieu d'un doublon qui ampute la capacité, et laisse au client une correction naturelle : il annule et refait.

**Précaution d'implémentation :** le contrôle de doublon doit s'exécuter **à l'intérieur du job déjà verrouillé** du ticket 04, sinon deux double-clics simultanés le contournent exactement comme ils contourneraient le contrôle de capacité. La clé de verrou étant dérivée de la date, et un doublon visant forcément la même date, le verrou existant couvre le cas sans en ajouter un second.

**Blocked by:** 04 — Réserver.

**Status:** done

- [x] Une seule Réservation `confirmed` par email et par Service : la seconde renvoie `409`
- [x] Ce contrôle tourne **dans le job verrouillé**, pas avant ni après
- [x] Une Réservation annulée ne bloque plus : le client peut refaire une demande sur le même Service
- [x] Limite de fréquence par email et par IP
- [x] Plafond global de Réservations créées par jour
- [x] **Aucune vérification d'identité, aucun double opt-in** : un email invalide signifie que le client n'aura pas son lien d'annulation, pas qu'il ne viendra pas
- [x] Le **téléphone reste obligatoire** — c'est le vrai canal de rattrapage
- [x] Test d'intégration HTTP : deux créations identiques d'affilée donnent une Réservation et un `409` ; après annulation de la première, une nouvelle création passe
- [x] Test d'intégration HTTP : deux créations identiques **en parallèle** ne donnent qu'une seule Réservation
