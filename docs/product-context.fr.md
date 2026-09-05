🇫🇷 Version française | [🇬🇧 English version](product-context.md)

---

# Contexte produit : CC-Beacon

> Miroir public du `PRODUCT.md` interne du projet (ignoré par git). Maintenu manuellement en cohérence quand la direction produit évolue.

## Utilisateurs

Un développeur solo qui surveille ses sessions Claude Code depuis son smartphone. Contexte d'usage : en mobilité, éclairage variable, consultation rapide entre deux tâches. L'utilisateur connaît l'outil par coeur, il n'a pas besoin d'aide pour naviguer, il a besoin de lire vite.

## Objectif produit

CC-Beacon rend le travail des sessions Claude Code visible à distance : chaque session écrit un fichier JSON structuré (un work) décrivant ses étapes, son statut et sa durée. Ces fichiers sont poussés vers un VPS et affichés dans une interface mobile minimaliste, accessible via une URL protégée par token.

Succès : d'un coup d'oeil depuis le téléphone, l'utilisateur sait où en sont ses tâches actives et combien de temps il reste estimé.

## Personnalité de marque

Fonctionnel - Direct - Discret

L'interface s'efface derrière les données. Pas de fioriture, pas de chrome inutile. Chaque élément a une raison d'être opérationnelle.

## Anti-références

Aucune esthétique spécifique à éviter, la boussole est "simple, efficace". Tout ajout qui n'améliore pas la lisibilité ou la rapidité de lecture est superflu.

## Principes de design

1. **Données d'abord** - chaque décision visuelle sert la lisibilité de l'information, pas l'apparence de l'interface.
2. **Mobile-natif** - la cible est le smartphone. Desktop n'est pas dans le scope.
3. **Scan avant lecture** - l'utilisateur doit comprendre l'état global en moins d'une seconde, avant de lire le détail.
4. **Rien de décoratif** - si un élément n'améliore pas la compréhension ou la vitesse de lecture, il n'a pas sa place.

## Accessibilité & inclusion

WCAG AA. Contraste minimum 4.5:1 pour le texte courant, 3:1 pour les grands textes et les éléments d'interface. Usage strictement personnel, mais la lisibilité en conditions variables (soleil, pénombre) justifie une rigueur sur le contraste.
