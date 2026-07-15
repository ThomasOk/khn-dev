# 04 — `GET /store/pickup-slots` : le storefront sait quels créneaux sont offrables

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « Le contrat de la route Store », § « Seam 1 »

**Status:** ready-for-agent

**Blocked by:** 01 (le seed — ce ticket y ajoute les Horaires par défaut), 03 (la dérivation).

## What to build

La dérivation existe mais rien ne peut l'interroger. Ce ticket l'expose : c'est la tranche verticale qui va de la configuration en base jusqu'à une route publique, et la première chose démontrable de la feature.

Le contrat :

```ts
{
  slots: Array<{ start: string; end: string }>   // ISO 8601 avec offset, ordre chronologique
  orders_open: boolean
}
```

**`orders_open` n'est pas redondant avec `slots.length > 0`** pour le client de l'API : c'est ce qui lui permet de distinguer « il ne reste plus de créneau aujourd'hui » (l'état **Commandes fermées**, qui mérite un message franc) d'une erreur réseau (une liste vide par accident). Une liste vide sans ce drapeau est ambiguë. C'est une information, pas une absence.

Les créneaux sont transportés en **ISO 8601 avec offset** (`2026-07-14T12:15:00+02:00`) — jamais en heure locale nue, jamais en timestamp sans fuseau.

Le seed gagne des **Horaires de retrait par défaut** et une Configuration par défaut (Délai, durée), sinon la route n'a rien à servir sur une base fraîche et personne ne peut la démontrer. Ces valeurs seront fausses — c'est prévu : le ticket 05 donne au restaurateur de quoi les corriger sans déploiement.

À savoir avant de commencer : le middleware de **clé publiable** et le CORS store s'appliquent automatiquement à tout le préfixe `/store`, routes custom comprises. Le SDK JS envoie la clé ; un `fetch()` nu échouerait. Le storefront passe donc par la couche SDK existante, conformément à `AGENTS.md`.

## Acceptance criteria

- [ ] `GET /store/pickup-slots` renvoie `{ slots, orders_open }`, les créneaux en ISO 8601 **avec offset** et en ordre chronologique
- [ ] Le seed installe des Horaires de retrait et une Configuration par défaut : sur une base fraîchement seedée, la route renvoie des créneaux
- [ ] Le storefront accède à la route via la couche SDK existante, pas par un `fetch()` nu (la clé publiable ne partirait pas)
- [ ] Tests d'intégration HTTP (`medusaIntegrationTestRunner`) : les créneaux rendus tombent dans les Horaires ; ceux qui sont **sous le Délai de préparation sont absents** ; une **Fermeture exceptionnelle vide la journée** ; `orders_open` vaut **`false`** quand il ne reste plus rien
- [ ] Les tests interrogent la route et regardent ce qu'elle rend — jamais les méthodes internes du module
