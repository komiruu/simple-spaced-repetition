# Notes d'intégration (technique)

Ce fichier est pour vous (build/maintenance) — le `README.md` à côté est le
texte public destiné aux utilisateurs du plugin, ne le mélangez pas avec
celui-ci.

Le code est validé à chaque itération : compilé (`tsc -noEmit -skipLibCheck`)
contre les vrais types Obsidian, bundlé avec esbuild comme le fait le script
de build du sample-plugin, et testé (round-trip du parseur, résilience à un
fichier "sale", non-destruction d'un fichier existant, logique de
complétion par watermark, gestion de l'extension `.md`) avant chaque
livraison.

## 1. Copier les fichiers

Copiez ces 9 fichiers **à la racine** de votre clone de `obsidian-sample-plugin`
(à côté du `main.ts` existant, en écrasant celui-ci) :

```
main.ts
types.ts
utils.ts
scheduler.ts
store.ts
settings.ts
view.ts
modal.ts
i18n.ts
styles.css
```

Aucun changement n'est nécessaire dans `esbuild.config.mjs` ou `tsconfig.json`.

## 2. manifest.json

- `"isDesktopOnly": false` doit être présent.
- Description suggérée (voir discussion dans la conversation) : le champ
  `description` du manifest ne supporte qu'une seule langue (pas d'objet
  multilingue possible côté Obsidian à ce jour) - gardez-le en anglais,
  c'est la convention de la liste des plugins communautaires.

## 3. Build

```bash
npm install
npm run dev     # ou "npm run build" pour la version de prod
```

## Historique des changements notables

- **i18n** : toute l'interface (paramètres, panneau, menus, notices) est en
  français si Obsidian est configuré en français, en anglais sinon. Géré
  par `i18n.ts` (détection via `localStorage.getItem('language')`, comme le
  fait Obsidian lui-même). Le format du fichier de sauvegarde reste
  toujours en anglais (`Added to ... on the ...`), volontairement non
  traduit.
- **Accents corrigés** dans toutes les chaînes françaises (l'omission
  initiale était une prudence d'encodage inutile).
- **`Added to`** avec majuscule dans le fichier de sauvegarde.
- **Bug de suppression d'un J+ tout juste ajouté/édité corrigé** : éditer un
  délai déclenchait un tri en mémoire (`cat.offsets.sort(...)`) sans
  re-rendre le panneau de réglages, donc les boutons de suppression
  gardaient une position (`idx`) obsolète et supprimaient le mauvais
  élément après un tri. Un `this.display()` a été ajouté juste après le tri
  pour que le DOM (et les `idx` capturés dans les callbacks) restent
  toujours synchronisés avec le tableau réellement trié.
- **Extensions `.md` masquées comme le fait Obsidian** : les liens générés
  dans le fichier de sauvegarde n'affichent plus `.md` (`[[Note]]` au lieu
  de `[[Note.md]]`), mais gardent toute autre extension (`[[image.png]]`).
  Le champ "Fichier de sauvegarde" des paramètres ajoute automatiquement
  `.md` si vous ne tapez aucune extension. Voir `toWikilinkPath` /
  `normalizeNotePath` dans `utils.ts`.
- **Ctrl/Cmd + clic** sur un élément du planning l'ouvre dans un nouvel
  onglet (`workspace.getLeaf(true)`) au lieu de l'onglet actif.
- **Barre d'outils du panneau en 3 lignes** plutôt qu'une seule ligne trop
  étroite : (1) choix de catégorie centré, (2) bouton de marquage centré,
  (3) "Jours vides" à gauche / bouton recharger à droite.
- Pour l'historique complet des versions précédentes (mode de stockage
  caché supprimé, marqueurs anti-écrasement, watermark de complétion en
  J+...), voir les messages précédents de la conversation - je n'ai gardé
  ici que le nécessaire pour la maintenance, pas un changelog complet.
