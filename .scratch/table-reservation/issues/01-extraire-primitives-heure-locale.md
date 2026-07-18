# 01 — Extraire les primitives d'heure locale du restaurant

**What to build:** Rien de visible pour personne. Les primitives de calcul en heure murale du restaurant — aujourd'hui privées à l'intérieur de `deriveSlots` — deviennent une brique partagée, réutilisable par le calcul de disponibilité des Réservations. C'est le « make the change easy » avant le « make the easy change » : la conversion heure murale → instant fait une passe double pour tomber juste les jours de changement d'heure, et la réécrire à côté serait l'endroit le plus probable pour réintroduire un bug de DST.

Sont concernées : la conversion heure murale locale → timestamp, l'offset du fuseau à un instant donné, la décomposition d'un instant en jour civil local, le jour de la semaine par arithmétique pure (Sakamoto), la conversion `HH:MM` → minutes, et la clé de jour civil. `RESTAURANT_TIMEZONE` reste l'unique autorité et n'est jamais redupliquée en dur.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Les primitives vivent dans un module de bibliothèque partagé, hors du dossier propre aux créneaux de retrait
- [ ] `deriveSlots` les consomme et ne contient plus de copie privée
- [ ] **Les tests unitaires existants de `deriveSlots` passent sans avoir été modifiés** — c'est le critère qui prouve que le comportement est identique
- [ ] Les primitives extraites ont leurs propres tests unitaires, dont au moins un aller-retour heure murale → instant → heure murale sur chacun des deux dimanches de changement d'heure
- [ ] Aucune lecture d'horloge système (`new Date()` sans argument) n'est introduite nulle part
- [ ] `pnpm test` vert
