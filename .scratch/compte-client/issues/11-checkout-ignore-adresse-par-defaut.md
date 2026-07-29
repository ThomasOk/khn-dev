# 11 — Le checkout ignore l'Adresse de facturation par défaut du Client

**Spec :** [docs/specs/compte-client.md](../../../docs/specs/compte-client.md) — § « Backend — l'adresse suit la Commande »
**Ticket lié :** [03 — L'Adresse de facturation suit la Commande](03-adresse-suit-la-commande.md)

**Status:** done

**Blocked by:** aucun.

## What to build

Le ticket 03 affirmait : « le lecteur, lui, existe déjà : le checkout pré-remplit depuis l'adresse de facturation par défaut du Client. Rien à construire de ce côté. » C'était vrai pour l'existence du code, faux pour son exécution : un Client de retour, avec une Adresse de facturation par défaut déjà écrite par une commande précédente, arrivait au checkout suivant avec un formulaire vide — nom, adresse, code postal, ville, téléphone tous à blanc, seul l'email survivait.

**La cause :** Medusa attache un stub `shipping_address` au panier dès que sa région/`country_code` est fixé — avant toute saisie du client. Ce stub a un `id` et un `country_code`, mais tous les autres champs sont `null`. Le formulaire (`shipping-address/index.tsx`) testait `if (cart?.shipping_address)` pour décider s'il devait ignorer l'Adresse de facturation par défaut du Client au profit de celle du panier — un objet toujours *truthy*, stub compris. La branche de repli sur `customer.addresses.find(is_default_billing)` n'était donc jamais atteinte pour un panier neuf : le stub gagnait systématiquement, silencieusement.

Rien à voir avec le cache ou un rafraîchissement de page : le bug se reproduisait identique à froid comme après un `cmd+shift+r`.

## Acceptance criteria

- [x] Une commande passée par un Client qui a déjà une Adresse de facturation par défaut arrive avec le checkout suivant pré-rempli (nom, adresse, code postal, ville, téléphone, email), même quand le panier n'a jamais eu d'adresse saisie manuellement
- [x] Un rafraîchissement de la page checkout ne fait pas disparaître le préremplissage
- [x] Reproduit et vérifié en conditions réelles sur l'instance de dev : compte existant avec commandes passées, nouveau panier, checkout observé vide avant correctif puis pré-rempli après, y compris après rafraîchissement

## Notes de mise en œuvre

- Correctif dans `apps/storefront/src/modules/checkout/components/shipping-address/index.tsx` : le court-circuit vérifie désormais un champ réellement significatif (`cart?.shipping_address?.address_1`) plutôt que la simple présence de l'objet, avant de décider d'ignorer l'Adresse de facturation par défaut du Client.
- Diagnostic confirmé par des logs temporaires posés sur `/checkout` (retirés une fois la cause identifiée) et une requête Postgres sur `cart_address` / `customer_address` — `customer.addresses` contenait bien la bonne adresse par défaut à chaque requête, elle n'était simplement jamais lue.
- Effet de bord corrigé au passage, par précaution : `placeOrder` (`apps/storefront/src/lib/data/cart.ts`) ne revalidait pas le tag de cache `customers` après la commande, alors que le souscripteur backend `customer-billing-address-sync` écrit la nouvelle Adresse de facturation par défaut de façon asynchrone et sans lien avec ce cache. Ce n'était pas la cause du bug reproduit ici (`customer.addresses` était déjà à jour dans tous les cas observés), mais ça reste un vrai trou en production : un cache client longue durée pourrait servir une adresse pré-synchronisation si rien ne le réinvalide jamais. `placeOrder` revalide maintenant ce tag après la commande.
