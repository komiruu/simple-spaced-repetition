import { Plugin, Notice } from 'obsidian';
import { SpacedReviewSettings, DEFAULT_SETTINGS, ReviewItem } from './types';
import { SpacedReviewSettingTab } from './settings';
import { SpacedReviewView, VIEW_TYPE_SPACED_REVIEW } from './view';
import { loadItemsFromVaultFile, saveItemsToVaultFile } from './store';
import { generateId, todayISO } from './utils';
import { CategoryPickModal } from './modal';

export default class SpacedReviewPlugin extends Plugin {
	settings: SpacedReviewSettings;
	items: ReviewItem[] = [];

	/** Set right before we write the save file ourselves, so the 'modify'
	 * listener below doesn't immediately reload what we just wrote. */
	private suppressNextFileEvent = false;

	async onload() {
		await this.loadSettings();
		await this.reloadFromFile();

		this.registerView(VIEW_TYPE_SPACED_REVIEW, (leaf) => new SpacedReviewView(leaf, this));

		this.addRibbonIcon('calendar-clock', 'Planning de revisions espacees', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-spaced-review-planning',
			name: 'Ouvrir le planning de revisions',
			callback: () => this.activateView(),
		});

		this.addCommand({
			id: 'mark-active-file-for-review',
			name: 'Marquer le fichier actif pour rappel espace',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (checking) return true;
				if (this.settings.categories.length === 0) {
					new Notice('Aucune categorie definie dans les parametres.');
					return true;
				}
				new CategoryPickModal(this.app, this.settings.categories, (catId) => {
					this.markForReview(file.path, undefined, catId);
				}).open();
				return true;
			},
		});

		// Right-click on a heading (in edit mode) -> "Marquer pour rappel espace".
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				const file = view.file;
				if (!file) return;
				const header = this.getHeadingAtCursor(editor);
				if (!header) return;
				if (this.settings.categories.length === 0) return;

				if (this.settings.categories.length === 1) {
					const cat = this.settings.categories[0];
					menu.addItem((item) =>
						item
							.setTitle(`Marquer pour rappel espace (${cat.name})`)
							.setIcon('calendar-clock')
							.onClick(() => this.markForReview(file.path, header, cat.id))
					);
					return;
				}

				menu.addItem((item) => {
					item.setTitle('Marquer pour rappel espace').setIcon('calendar-clock');
					// setSubmenu() gives a nested menu of categories to pick from.
					// Falls back to the first category if the installed Obsidian
					// API typings/version don't expose it.
					const anyItem = item as any;
					if (typeof anyItem.setSubmenu === 'function') {
						const sub = anyItem.setSubmenu();
						for (const cat of this.settings.categories) {
							sub.addItem((subItem: any) =>
								subItem.setTitle(cat.name).onClick(() => this.markForReview(file.path, header, cat.id))
							);
						}
					} else {
						item.onClick(() => this.markForReview(file.path, header, this.settings.categories[0].id));
					}
				});
			})
		);

		// Keep the in-memory planning in sync with the save file on disk:
		// this fires both when the user edits it by hand and when Obsidian
		// silently rewrites a link inside it after a file rename.
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				if (file.path !== this.settings.vaultFilePath) return;
				if (this.suppressNextFileEvent) {
					this.suppressNextFileEvent = false;
					return;
				}
				await this.reloadFromFile();
				this.refreshView();
			})
		);

		this.addSettingTab(new SpacedReviewSettingTab(this.app, this));
	}

	onunload() {}

	private getHeadingAtCursor(editor: any): string | undefined {
		const cursor = editor.getCursor();
		for (let line = cursor.line; line >= 0; line--) {
			const text: string = editor.getLine(line);
			const m = text.match(/^#{1,6}\s+(.+)$/);
			if (m) return m[1].trim();
		}
		return undefined;
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_SPACED_REVIEW)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (!rightLeaf) return;
			leaf = rightLeaf;
			await leaf.setViewState({ type: VIEW_TYPE_SPACED_REVIEW, active: true });
		}
		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	/** Re-reads the save file from disk into memory. Safe to call anytime -
	 * used on load, on an external file change, and from the manual reload
	 * button in the view. */
	async reloadFromFile() {
		this.items = await loadItemsFromVaultFile(this.app, this.settings.vaultFilePath, this.settings.categories);
	}

	private async writeItemsToFile() {
		this.suppressNextFileEvent = true;
		await saveItemsToVaultFile(this.app, this.settings.vaultFilePath, this.items, this.settings.categories);
	}

	/** Called by the settings tab whenever something changes. Re-serialises
	 * the currently held items (not a fresh reload) so that e.g. renaming a
	 * category in settings immediately propagates its new name into the
	 * file for every item that referenced it. */
	async saveSettings() {
		await this.saveData(this.settings);
		await this.writeItemsToFile();
		this.refreshView();
	}

	async markForReview(filePath: string, header: string | undefined, categoryId: string) {
		const item: ReviewItem = {
			id: generateId(),
			filePath,
			header,
			categoryId,
			markedDate: todayISO(),
			overrides: [],
			completedThroughOffset: 0,
		};
		this.items.push(item);
		await this.writeItemsToFile();
		this.refreshView();
		new Notice(header ? `Section marquee pour rappel : ${header}` : 'Fichier marque pour rappel');
	}

	async moveOccurrence(itemId: string, occurrenceIndex: number, newDateISO: string) {
		const item = this.items.find((i) => i.id === itemId);
		if (!item) return;
		const existing = item.overrides.find((o) => o.index === occurrenceIndex);
		if (existing) existing.date = newDateISO;
		else item.overrides.push({ index: occurrenceIndex, date: newDateISO });
		await this.writeItemsToFile();
		this.refreshView();
	}

	/**
	 * Toggles completion for the occurrence at this raw category offset
	 * (its J+N), using a watermark: checking it marks everything due at or
	 * before this offset as done; unchecking it pulls the watermark back
	 * down to just below this offset. See completedThroughOffset in
	 * types.ts for the reasoning.
	 */
	async toggleCompleted(itemId: string, offset: number) {
		const item = this.items.find((i) => i.id === itemId);
		if (!item) return;
		if (offset <= item.completedThroughOffset) {
			item.completedThroughOffset = offset - 1;
		} else {
			item.completedThroughOffset = offset;
		}
		await this.writeItemsToFile();
		this.refreshView();
	}

	async removeItem(itemId: string) {
		this.items = this.items.filter((i) => i.id !== itemId);
		await this.writeItemsToFile();
		this.refreshView();
	}

	refreshView() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_SPACED_REVIEW)) {
			const view = leaf.view;
			if (view instanceof SpacedReviewView) view.render();
		}
	}
}
