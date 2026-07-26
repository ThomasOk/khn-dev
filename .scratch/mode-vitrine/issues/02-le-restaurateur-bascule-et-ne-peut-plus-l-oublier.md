# 02 — Le restaurateur bascule, et ne peut plus l'oublier

**What to build:** Le geste d'urgence, depuis l'admin. Le restaurateur suspend la commande en ligne sans passer par un client HTTP, écrit sa phrase d'explication s'il en a le temps, et ne peut plus laisser le site fermé sans le savoir.

Un écran de réglages porte l'interrupteur et la **Note de vitrine**, avec son compteur de caractères visible pendant la saisie. Quand le champ est vide, il arrive **pré-rempli** d'une phrase toute faite que le restaurateur garde, réécrit ou efface — un défaut de formulaire, exactement comme la date de fin à +14 jours du formulaire d'Annonce.

Et tant que le mode est actif, un bandeau rouge le suit sur **toutes** les pages de l'admin, avec le bouton pour rouvrir. C'est la seule chose qui s'oppose au mode de défaillance le plus coûteux de cette feature : rester fermé sans le savoir, parce qu'une liste de commandes vide ressemble exactement à une journée calme.

Placé avant les deux tickets storefront exprès : ils se vérifient à la main en basculant l'interrupteur, ce qui est pénible tant qu'il n'existe qu'en HTTP.

**Blocked by:** 01 — La vanne, de bout en bout.

**Status:** ready-for-agent

- [ ] Route de réglages `settings/showcase`, à côté de `pickup`, `closures`, `announcements` et `table-reservation`
- [ ] L'écran porte l'interrupteur, le champ note et l'enregistrement, en tapant les routes admin livrées en 01
- [ ] Compteur de caractères affiché **pendant** la saisie, pas découvert au submit — comme le compteur d'accroche de l'écran Annonces
- [ ] Quand la note enregistrée est vide, le champ est **pré-rempli** de la phrase suggérée « La commande en ligne est momentanément suspendue. »
- [ ] Cette phrase est effaçable : enregistrer un champ vidé enregistre bien « pas de note », et ne réécrit pas la suggestion
- [ ] La phrase suggérée vit **uniquement dans le formulaire admin**, jamais dans le rendu du storefront. Ce que le client lit vient toujours de la base, donc toujours de quelqu'un qui a cliqué « enregistrer »
- [ ] La note est éditable que le mode soit actif ou non — on peut préparer le texte à froid, et corriger le texte sans rouvrir les commandes
- [ ] Le refus de validation du backend (note trop longue) remonte en erreur inline sur le champ
- [ ] Widget admin injecté sur la liste des commandes — art antérieur : `order-pickup-slot.tsx`, `formule-curation.tsx`
- [ ] Le widget ne s'affiche **que** lorsque le mode est actif, et il est rouge : il doit être impossible à ne pas voir
- [ ] Il porte un unique bouton « Réactiver les commandes », qui éteint le mode sans quitter la page
- [ ] Il **n'allume pas** : allumer est un geste délibéré qui passe par l'écran de réglages. C'est le coût connu de cette décision — l'extinction est à un clic depuis n'importe où, l'allumage demande une navigation
- [ ] Après extinction depuis le widget, l'état affiché est à jour sans rechargement manuel
- [ ] Aucun test automatisé ajouté pour l'admin : l'admin Medusa n'a pas de seam de test dans ce repo, et les routes qui portent la logique sont déjà couvertes par 01
