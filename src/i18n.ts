export type Lang = 'fr' | 'en';

/**
 * Obsidian stores the user's chosen display language in localStorage under
 * the key "language" (e.g. "fr", "en", "de", ...). We only ever show French
 * or English: French if Obsidian's interface is French, English otherwise.
 */
export function detectLang(): Lang {
	try {
		const stored = window.localStorage.getItem('language');
		if (stored && stored.toLowerCase().startsWith('fr')) return 'fr';
	} catch (e) {
		// localStorage unavailable (shouldn't happen in Obsidian) - fall back to English.
	}
	return 'en';
}

type StringKey = keyof typeof STRINGS.en;

const STRINGS = {
	en: {
		ribbonTooltip: 'Spaced review planning',
		cmdOpenPlanning: 'Open review planning',
		cmdMarkActiveFile: 'Mark active file for spaced review',
		noticeNoCategoriesCmd: 'No category configured in settings.',
		menuMarkForReviewCategory: 'Mark for spaced review ({name})',
		menuMarkForReview: 'Mark for spaced review',
		noticeMarkedHeader: 'Section marked for review: {header}',
		noticeMarkedFile: 'File marked for review',

		viewDisplayText: 'Review planning',
		reloadAriaLabel: 'Reload from file',
		noticeReloaded: 'Planning reloaded from file',
		markFileButton: 'Mark this file for review',
		noticeNoActiveFile: 'No active file',
		noticeNoCategoriesView: 'No category configured in settings',
		toggleEmptyDaysLabel: 'Empty days',
		dayLabelStillDue: 'Not completed',
		itemMovedSuffix: ' moved',
		contextMenuDelete: 'Delete this review tracking',
		noticeFileNotFound: 'File not found: {path}',
		todaySuffix: " (today)",

		modalTitle: 'Choose a review category',
		modalChooseButton: 'Choose',

		settingsTitle: 'Spaced review',
		settingsSaveFileName: 'Save file',
		settingsSaveFileDesc:
			"Markdown file in your vault where reminders are stored. You can open and edit it directly " +
			"(Obsidian updates links automatically when you rename a file). The plugin only ever writes to " +
			"a marked section of this file and never touches the rest, even if you point it at an existing note.",
		settingsShowEmptyDaysName: 'Show empty days',
		settingsShowEmptyDaysDesc: 'Also show days with no review scheduled, so you can drop a moved item there.',
		settingsShowAllUntilLastName: 'Show every day until the last reminder',
		settingsShowAllUntilLastDesc: 'If disabled, only a fixed window of days (below) is shown.',
		settingsHorizonName: 'Window (in days)',
		settingsCategoriesTitle: 'Review categories',
		settingsCategoriesDesc:
			'Each category has a name, a unique letter (shown in front of the repetition number, e.g. "m3"), ' +
			'and a list of delays in days (J+...).',
		settingsDuplicateLettersWarning: 'Warning: letter(s) used by more than one category: {letters}',
		settingsAddCategory: '+ Add a category',
		settingsNewCategoryName: 'New category',
		settingsCategoryNameLetterLabel: 'Name / letter',
		settingsCategoryDeleteTooltip: 'Delete this category',
		settingsOffsetsLabel: 'Reminders (J+): ',
	},
	fr: {
		ribbonTooltip: 'Planning de révisions espacées',
		cmdOpenPlanning: 'Ouvrir le planning de révisions',
		cmdMarkActiveFile: 'Marquer le fichier actif pour rappel espacé',
		noticeNoCategoriesCmd: 'Aucune catégorie définie dans les paramètres.',
		menuMarkForReviewCategory: 'Marquer pour rappel espacé ({name})',
		menuMarkForReview: 'Marquer pour rappel espacé',
		noticeMarkedHeader: 'Section marquée pour rappel : {header}',
		noticeMarkedFile: 'Fichier marqué pour rappel',

		viewDisplayText: 'Planning de révisions',
		reloadAriaLabel: 'Recharger depuis le fichier',
		noticeReloaded: 'Planning rechargé depuis le fichier',
		markFileButton: 'Marquer ce fichier pour rappel',
		noticeNoActiveFile: 'Aucun fichier actif',
		noticeNoCategoriesView: 'Aucune catégorie définie dans les paramètres',
		toggleEmptyDaysLabel: 'Jours vides',
		dayLabelStillDue: 'Non complété',
		itemMovedSuffix: ' déplacé',
		contextMenuDelete: 'Supprimer ce suivi de révision',
		noticeFileNotFound: 'Fichier introuvable : {path}',
		todaySuffix: " (aujourd'hui)",

		modalTitle: 'Choisir une catégorie de révision',
		modalChooseButton: 'Choisir',

		settingsTitle: 'Révisions espacées',
		settingsSaveFileName: 'Fichier de sauvegarde',
		settingsSaveFileDesc:
			"Fichier Markdown du vault où sont stockés les rappels. Vous pouvez l'ouvrir et l'éditer directement " +
			"(Obsidian met à jour les liens automatiquement en cas de renommage de fichier). Le plugin n'écrit " +
			"que dans une section marquée du fichier et ne touche jamais au reste, même si vous pointez vers " +
			"une note existante.",
		settingsShowEmptyDaysName: 'Afficher les jours vides',
		settingsShowEmptyDaysDesc: 'Affiche aussi les jours sans révision prévue, pour pouvoir y déposer un élément déplacé.',
		settingsShowAllUntilLastName: "Afficher tous les jours jusqu'au dernier rappel",
		settingsShowAllUntilLastDesc: 'Si désactivé, seule une fenêtre de jours (ci-dessous) est affichée.',
		settingsHorizonName: 'Fenêtre (en jours)',
		settingsCategoriesTitle: 'Catégories de révision',
		settingsCategoriesDesc:
			'Chaque catégorie a un nom, une lettre unique (affichée devant le numéro de répétition, ' +
			'ex : "m3"), et une liste de délais en jours (J+...).',
		settingsDuplicateLettersWarning: 'Attention : lettre(s) utilisée(s) par plusieurs catégories : {letters}',
		settingsAddCategory: '+ Ajouter une catégorie',
		settingsNewCategoryName: 'Nouvelle catégorie',
		settingsCategoryNameLetterLabel: 'Nom / lettre',
		settingsCategoryDeleteTooltip: 'Supprimer la catégorie',
		settingsOffsetsLabel: 'Rappels (J+) : ',
	},
} as const;

const currentLang: Lang = detectLang();

export function t(key: StringKey, params?: Record<string, string | number>): string {
	let template: string = STRINGS[currentLang][key] ?? STRINGS.en[key] ?? key;
	if (params) {
		for (const k of Object.keys(params)) {
			template = template.split(`{${k}}`).join(String(params[k]));
		}
	}
	return template;
}

export function getLang(): Lang {
	return currentLang;
}
