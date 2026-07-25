# 03 — L'écran de réglages admin

**What to build:** Le restaurateur écrit, modifie et supprime une Annonce depuis l'admin, sans curl et sans développeur. C'est ici que la feature devient utilisable par un humain.

Il ouvre une page de réglages à côté de celles du retrait, des fermetures et de la réservation. Il y voit **toutes** ses Annonces — passées, en cours, à venir — avec leur état lisible d'un coup d'œil, de sorte qu'il sait ce que voient ses clients **maintenant**. Il en crée une, la corrige, la retire avant terme si la raison qui la justifiait a disparu.

Deux frictions à supprimer parce qu'elles se paient à chaque saisie : la date de fin est **pré-remplie**, et la longueur de l'accroche se voit **pendant** l'écriture, pas au moment du refus.

Un point que l'écran doit rendre évident, faute de quoi la feature rate sa cible : **la Période d'annonce n'est pas la période dont on parle**. Une fermeture du 10 au 20 août s'annonce du 1er au 20 — on prévient avant, et le bandeau reste pendant la fermeture pour le client qui débarque le 15. Un restaurateur qui saisit mécaniquement 10–20 n'aura prévenu personne.

**Blocked by:** 02 — Une seule à la fois : le chevauchement refusé.

**Status:** done

- [x] Route de réglages admin `announcements`, à côté de celles de `pickup`, `closures` et `table-reservation`
- [x] Liste de toutes les Annonces avec leur état visible : passée, en cours, à venir
- [x] Création, modification et suppression depuis l'écran
- [x] Date de fin **pré-remplie à début + 14 jours** — un défaut de formulaire, pas une contrainte du modèle : rien n'interdit une période plus longue
- [x] Compteur de caractères de l'accroche affiché **pendant** la saisie, pas découvert au submit
- [x] Le 409 de chevauchement remonte en **erreur inline nommant la période en conflit**, pas en erreur générique
- [x] L'écran distingue visiblement la Période d'annonce de la période dont l'annonce parle — libellé, aide ou exemple, au choix de l'implémentation
- [x] Aucune référence, aucun lien, aucune lecture des Fermetures exceptionnelles depuis cet écran (ADR 0009)
