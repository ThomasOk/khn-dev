# 07 — La Feuille de service

**What to build:** Le restaurateur sort, avant le service, la liste des Réservations du jour : par heure croissante, avec le nom, le nombre de Couverts, le téléphone et la note. C'est le pendant du Ticket cuisine côté salle — un document de production, lu debout, sans prix et sans email.

C'est aussi ce qui rend l'ADR 0008 tenable : puisque personne ne clique sur rien pendant le service, la feuille est le seul objet qui porte l'information au moment où elle sert. Le téléphone y figure parce que c'est le seul moyen de joindre un client qui n'arrive pas.

**Blocked by:** 04 — Réserver.

**Status:** ready-for-agent

- [ ] Route admin renvoyant les Réservations d'un jour donné, triées par heure croissante
- [ ] Les Réservations annulées **n'y figurent pas**
- [ ] Vue admin affichant nom, heure, Couverts, téléphone et note, imprimable en une page
- [ ] Le restaurateur peut consulter et corriger une Réservation depuis l'admin — le client a appelé
- [ ] Test d'intégration HTTP : un jour donné renvoie les `confirmed` dans l'ordre horaire et **pas** les `cancelled`
