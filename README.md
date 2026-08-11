# Plugin de révisions espacées — intégration

Le code est validé : compilé (`tsc -noEmit -skipLibCheck`) contre les vrais
types Obsidian, bundlé avec esbuild comme le fait le script de build du
sample-plugin, et le parseur/sérialiseur du fichier de sauvegarde est
couvert par des tests automatisés (round-trip, résilience à un fichier
"sale", logique de complétion, et surtout non-destruction d'un fichier
existant) avant livraison.

## 1. Copier les fichiers

Copiez ces 8 fichiers **à la racine** de votre clone de `obsidian-sample-plugin`
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
styles.css
```

Aucun changement n'est nécessaire dans `esbuild.config.mjs` ou `tsconfig.json`.

## 2. manifest.json

Assurez-vous que `"isDesktopOnly": false` est présent.

## 3. Build

```bash
npm install
npm run dev     # ou "npm run build" pour la version de prod
```

## Ce qui a changé dans cette révision

- **Correction : le renommage de heading peut être suivi automatiquement.**
  Mon README précédent disait que non — c'est faux : c'est le cas si vous
  utilisez la commande dédiée d'Obsidian "Renommer le titre" (clic droit sur
  le heading, ou la commande associée) plutôt que d'éditer le texte
  directement. Dans ce cas Obsidian met aussi à jour le lien dans notre
  fichier de sauvegarde, comme pour un renommage de fichier.

- **Lien moins voyant.** L'entrée n'est plus préfixée par `## ` (qui
  s'affichait en gros titre) : elle commence directement par
  `[[Note#Header]]`, une ligne de texte normale. Une entrée est détectée dès
  qu'une ligne contient un wikilink en début de ligne (avec ou sans `#...`
  devant, pour rester compatible si vous ajoutez vous-même un niveau de
  titre).

- **Complétion : "watermark" en J+, plus un numéro de répétition.** Le
  problème que vous avez soulevé était réel : un numéro de répétition (1,
  2, 3...) se décale si vous supprimez un J+ intermédiaire dans une
  catégorie, et la case cochée pointerait alors sur la mauvaise répétition.
  Solution retenue : `> Completed until J+<n>` — on enregistre le J+
  (délai en jours) de la répétition la plus tardive cochée, pas sa
  position. Toute répétition dont le J+ est ≤ cette valeur est considérée
  faite. Concrètement :
  - Cocher `m3` (ex. J+20) coche aussi automatiquement `m1` et `m2` s'ils
    ont un J+ inférieur (logique : si vous avez fait la révision à J+20,
    les précédentes sont forcément faites aussi).
  - Supprimer ou ajouter un J+ intermédiaire ailleurs dans la liste ne
    déplace rien : le watermark reste attaché à la valeur J+20 elle-même,
    pas à une position dans le tableau.
  - Décocher une répétition ramène le watermark juste en dessous de son
    J+, ce qui décoche aussi tout ce qui était après elle.
  - J'ai choisi de baser ça sur le J+ (le délai configuré) plutôt que sur
    la date affichée : un déplacement par glisser-déposer ne change que la
    date affichée, pas le J+ d'origine, donc déplacer une révision ne
    décoche jamais rien par accident. Testé avec suppression d'un J+
    intermédiaire en cours de route : la case cochée reste correcte.

- **Protection anti-écrasement du fichier.** C'est le point le plus
  important : plus aucun code du plugin ne peut effacer du contenu qui ne
  lui appartient pas.
  - Toutes les données du plugin sont maintenant encadrées par deux
    marqueurs invisibles en mode lecture (`<!-- spaced-review-plugin:start
    -->` / `... :end -->`) dans le fichier de sauvegarde.
  - À l'écriture : si les marqueurs existent déjà, **seul** le texte entre
    eux est remplacé — tout ce qui est avant/après (vos propres notes) est
    conservé tel quel. S'ils n'existent pas encore (fichier neuf, ou note
    existante que vous pointez pour la première fois), le bloc du plugin
    est **ajouté à la fin**, jamais en écrasant.
  - Résultat concret sur votre cas : pointer le chemin du fichier de
    sauvegarde vers une note déjà existante n'efface plus son contenu — le
    plugin ajoute ses infos à la fin, puis ne touchera plus que sa propre
    section aux écritures suivantes.
  - Le champ "Fichier de sauvegarde" dans les paramètres ne valide
    maintenant qu'à la perte du focus (pas à chaque frappe), pour éviter
    d'écrire accidentellement dans un chemin partiel pendant que vous
    tapez. Au changement de chemin, le plugin relit d'abord ce qu'il
    reconnaît déjà à ce nouvel emplacement (s'il y en a) avant de continuer
    à écrire dessus.
  - Testé avec un faux vault en mémoire : écrire deux fois de suite dans
    une note contenant déjà du texte personnel préserve ce texte intégralement.

- **Rechargement automatique** (déjà en place, toujours actif) : le plugin
  écoute les modifications du fichier de sauvegarde et recharge les items
  en mémoire dès qu'il change sur le disque, plus un bouton ↻ pour forcer
  une relecture manuelle, plus un rechargement systématique à l'ouverture
  du panneau.

## Utilisation

- **Marquer un fichier entier** : bouton "Marquer ce fichier pour rappel"
  en haut du panneau, avec le menu déroulant de catégorie à côté.
- **Marquer un header** : en mode édition, clic droit sur la ligne du
  header → "Marquer pour rappel espacé".
- **Planning** : badge `m3` = catégorie "m" (Mineure), 3ᵉ répétition.
- **Cocher/décocher** une répétition : case à cocher à droite de chaque
  ligne (voir la logique de watermark ci-dessus).
- **Déplacer une révision** : glisser-déposer sur un autre jour.
- **Ouvrir la note** : cliquer (sans glisser) un élément.
- **Supprimer un suivi** : clic droit → "Supprimer ce suivi de révision".
- **Recharger** : icône ↻ en haut du panneau.

## Limites connues

- Renommer le **texte** d'un heading directement (sans passer par la
  commande dédiée d'Obsidian) n'est pas suivi automatiquement : le lien
  devient obsolète. Le fichier restant un Markdown normal, vous pouvez
  corriger la ligne `[[...]]` à la main sans perdre la date ni l'historique
  qui suivent juste en dessous.
- Supprimer une catégorie encore utilisée par des items existants les rend
  orphelins (disparaissent du planning) plutôt que de les réassigner
  automatiquement — renommez plutôt que de supprimer si des révisions sont
  en cours dessus.
- Si le fichier de sauvegarde est modifié en même temps par deux sources à
  la fraction de seconde près (vous tapez pendant que le plugin écrit),
  c'est le dernier à écrire qui gagne, comme pour tout fichier partagé.
