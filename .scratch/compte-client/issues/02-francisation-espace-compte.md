# 02 — L'espace compte parle français

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — User Story 26 ; § « Storefront — la déconnexion, la francisation »

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement.

## What to build

Tout l'espace compte est aujourd'hui dans l'anglais du starter Medusa. La page d'inscription propose de devenir *« a Medusa Store Member »*, la connexion promet *« an enhanced shopping experience »*, l'accueil du compte annonce *« No recent orders »*, et le titre de la page de profil parle de *« your Medusa Store profile »*. C'est resté invisible parce qu'aucun lien ne mène à ces pages — le ticket 10 va précisément les rendre atteignables.

Ce ticket est un **prefactor**, et son ordre compte : franciser d'abord, et les écrans ajoutés par les tickets 04, 05 et 07 naissent en français. Dans l'ordre inverse, on francise deux fois.

Sont concernés : la connexion, l'inscription, l'accueil du compte, le profil, la liste des commandes et le détail d'une commande, la navigation interne du compte, et les **titres et métadonnées de page** — que la francisation oublie systématiquement parce qu'ils ne se voient pas à l'écran.

La langue est celle du restaurant, pas une traduction littérale du starter. *« Become a Medusa Store Member »* ne devient pas « Devenez membre » : la page dit ce que le Compte fait ici, c'est-à-dire éviter de retaper son adresse. Le vocabulaire suit le glossaire — on dit **Commande**, jamais « order » ni « achat », et **Adresse de facturation**, jamais « adresse de livraison », puisque rien n'est jamais livré.

Aucun comportement ne change. C'est un ticket de texte, et le seul risque est d'en oublier.

## Acceptance criteria

- [ ] Plus aucune occurrence de « Medusa Store » sur une page atteignable par un client
- [ ] Connexion, inscription, accueil du compte, profil, liste des commandes et détail d'une commande sont entièrement en français
- [ ] La navigation interne du compte est en français, y compris ses libellés accessibles
- [ ] Les titres et métadonnées de page sont en français
- [ ] Les messages d'erreur et les états vides sont en français — notamment celui affiché quand aucune commande n'est rattachée
- [ ] Le vocabulaire suit le glossaire : Commande, Adresse de facturation ; jamais « livraison » ni « expédition »
- [ ] Aucun comportement, route ou appel de données n'est modifié
