# Révisions espacées

*(English summary below the French guide.)*

Un planificateur de révisions espacées pour Obsidian : marquez un cours ou
une section de cours que vous maîtrisez déjà, et le plugin vous rappelle
d'y rejeter un œil à intervalles croissants (par exemple J+2, J+7, J+20,
J+60...), directement depuis un panneau dans la barre latérale.

## Pourquoi pas simplement Anki ?

Ce plugin **n'est pas** un outil d'apprentissage actif comme Anki : pas de
flashcards, pas de test de connaissances, pas d'algorithme d'espacement
individualisé par carte. Son seul objectif est plus modeste : **éviter
d'oublier** ce que vous avez déjà compris, en vous rappelant régulièrement
de relire un cours ou une fiche que vous maîtrisez.

Il a été pensé à l'origine pour des étudiants de classes préparatoires, qui
ont énormément de cours à absorber et peu de temps pour de la répétition
active carte par carte sur chaque notion. L'idée : dès qu'un chapitre est
bien maîtrisé, on le marque une fois, et le plugin planifie tout seul
quelques relectures espacées dans le temps — un rappel léger, pas un
entraînement.

## Comment ça marche

- Vous avez terminé un chapitre, une fiche de révision, ou un exercice
  représentatif d'un chapitre ? Marquez le **header** correspondant pour
  un rappel "mineur" : clic droit dessus en mode édition → *Marquer pour
  rappel espacé*.
- Vous avez terminé un cours entier ? Marquez le **fichier entier** pour un
  rappel "majeur" : bouton en haut du panneau de planning.
- Le plugin planifie alors automatiquement plusieurs relectures espacées
  dans le temps (par défaut : J+2, J+7, J+20, J+60, J+180 pour un rappel
  mineur ; J+10, J+30, J+90, J+270 pour un rappel majeur — entièrement
  personnalisable dans les paramètres).
- Ouvrez le panneau (icône calendrier dans la barre latérale) pour voir
  toutes les relectures à venir, jour par jour.
- **Cochez** une relecture une fois faite (case à droite de chaque ligne).
  Décochez si besoin.
- **Glissez-déposez** une relecture sur un autre jour pour la reporter.
- **Ctrl/Cmd + clic** sur un élément pour l'ouvrir dans un nouvel onglet,
  simple clic pour l'ouvrir dans l'onglet actuel.
- Les relectures passées non cochées sont regroupées dans une section
  "Non complété" en haut du panneau, pour ne rien perdre de vue.

## Catégories personnalisables

Dans les paramètres, créez autant de catégories que vous voulez (par
défaut : Mineure et Majeure), chacune avec :

- un nom,
- une lettre unique affichée devant le numéro de répétition dans le
  planning (ex. `m3` = 3ᵉ répétition d'une catégorie "Mineure"),
- une liste de délais en jours (J+...) — ajoutez, retirez, modifiez-les
  librement.

## Le fichier de sauvegarde

Toutes les relectures programmées sont stockées dans un simple fichier
Markdown de votre vault (par défaut `Revisions/planning.md`, modifiable
dans les paramètres). Vous n'avez normalement jamais besoin d'y toucher,
mais rien ne vous empêche de l'ouvrir et de corriger une date ou une
catégorie directement si besoin — chaque relecture y apparaît sous cette
forme :

```
[[Nom de la note#Nom du header]]
Added to Mineure on the 01/08/2026
- 2 to 10/08/2026
> Completed until J+20
```

- La première ligne est un lien Obsidian classique vers la note (ou la
  note et le header) concerné.
- La deuxième ligne indique la catégorie et la date à laquelle vous avez
  marqué cet élément.
- Une ligne commençant par `-` signale qu'une relecture précise a été
  déplacée manuellement à une nouvelle date (glisser-déposer).
- La ligne commençant par `>` indique jusqu'où (en J+) les relectures ont
  été cochées comme faites.

## Langue

L'interface s'affiche en français si Obsidian est configuré en français,
en anglais sinon.

## Crédits

Idée, design et fonctionnement pensés par **Komiru**. Intégralement codé
par **Claude** (Anthropic).

---

## English summary

A spaced-review *planner* for Obsidian — not a flashcard/learning tool like
Anki. Mark a note or heading you already understand, and the plugin
schedules a handful of follow-up reminders at growing intervals (e.g. J+2,
J+7, J+20, J+60...) in a simple sidebar planning view, so you know what to
skim again before you forget it.

Built for students who already understand their material and just want a
lightweight, distraction-free way to keep it fresh — not to learn it from
scratch. Mark a heading for a "minor" reminder (right-click it in edit
mode) once you've mastered a chapter or worked through a representative
exercise; mark the whole file for a "major" reminder once you've finished
an entire course module. Everything - categories, their letter, and their
J+delays - is configurable in settings. Check off, drag-and-drop to
reschedule, or Ctrl/Cmd-click to open in a new tab.

Reminders are stored as plain Markdown in a vault file of your choosing,
readable and editable by hand if you ever need to.

**Credits:** designed and specified by **Komiru**, entirely coded by
**Claude** (Anthropic).
