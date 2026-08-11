import { App, PluginSettingTab, Setting } from 'obsidian';
import type SpacedReviewPlugin from './main';
import { ReviewCategory } from './types';
import { generateId, normalizeNotePath } from './utils';
import { t } from './i18n';

export class SpacedReviewSettingTab extends PluginSettingTab {
	plugin: SpacedReviewPlugin;

	constructor(app: App, plugin: SpacedReviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: t('settingsTitle') });

		new Setting(containerEl)
			.setName(t('settingsSaveFileName'))
			.setDesc(t('settingsSaveFileDesc'))
			.addText((text) => {
				text.setValue(this.plugin.settings.vaultFilePath);
				// Committed on blur rather than per-keystroke: writing on every
				// character typed would otherwise touch a different (partial,
				// unintended) path on each keystroke.
				text.inputEl.addEventListener('blur', async () => {
					const raw = text.inputEl.value.trim();
					if (!raw) return;
					const newPath = normalizeNotePath(raw); // adds ".md" if you didn't type an extension, like Obsidian itself does
					text.setValue(newPath);
					if (newPath === this.plugin.settings.vaultFilePath) return;
					this.plugin.settings.vaultFilePath = newPath;
					// Adopt whatever the plugin already recognises at the new
					// path (if anything) instead of discarding it.
					await this.plugin.reloadFromFile();
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t('settingsShowEmptyDaysName'))
			.setDesc(t('settingsShowEmptyDaysDesc'))
			.addToggle((tg) =>
				tg.setValue(this.plugin.settings.showEmptyDays).onChange(async (v) => {
					this.plugin.settings.showEmptyDays = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t('settingsShowAllUntilLastName'))
			.setDesc(t('settingsShowAllUntilLastDesc'))
			.addToggle((tg) =>
				tg.setValue(this.plugin.settings.showAllUntilLast).onChange(async (v) => {
					this.plugin.settings.showAllUntilLast = v;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		if (!this.plugin.settings.showAllUntilLast) {
			new Setting(containerEl).setName(t('settingsHorizonName')).addText((text) =>
				text.setValue(String(this.plugin.settings.horizonDays)).onChange(async (v) => {
					const n = parseInt(v, 10);
					if (!isNaN(n) && n > 0) {
						this.plugin.settings.horizonDays = n;
						await this.plugin.saveSettings();
					}
				})
			);
		}

		containerEl.createEl('h3', { text: t('settingsCategoriesTitle') });
		containerEl.createEl('p', {
			text: t('settingsCategoriesDesc'),
			cls: 'setting-item-description',
		});

		const seenLetters = new Set<string>();
		const duplicateLetters = new Set<string>();
		for (const cat of this.plugin.settings.categories) {
			if (seenLetters.has(cat.letter)) duplicateLetters.add(cat.letter);
			seenLetters.add(cat.letter);
		}
		if (duplicateLetters.size > 0) {
			containerEl.createEl('p', {
				text: t('settingsDuplicateLettersWarning', { letters: Array.from(duplicateLetters).join(', ') }),
				cls: 'mod-warning',
			});
		}

		for (const cat of this.plugin.settings.categories) {
			this.renderCategory(containerEl, cat);
		}

		new Setting(containerEl).addButton((btn) =>
			btn.setButtonText(t('settingsAddCategory')).onClick(async () => {
				this.plugin.settings.categories.push({
					id: generateId(),
					name: t('settingsNewCategoryName'),
					letter: 'N',
					offsets: [7],
				});
				await this.plugin.saveSettings();
				this.display();
			})
		);
	}

	private renderCategory(containerEl: HTMLElement, cat: ReviewCategory) {
		const box = containerEl.createDiv({ cls: 'spaced-review-category-box' });

		new Setting(box)
			.setName(t('settingsCategoryNameLetterLabel'))
			.addText((tc) => {
				tc.setValue(cat.name).onChange(async (v) => {
					cat.name = v;
					await this.plugin.saveSettings();
				});
			})
			.addText((tc) => {
				tc.inputEl.maxLength = 3;
				tc.inputEl.style.width = '3.5em';
				tc.setValue(cat.letter).onChange(async (v) => {
					cat.letter = v.slice(0, 3) || cat.letter;
					await this.plugin.saveSettings();
				});
			})
			.addExtraButton((b) =>
				b
					.setIcon('trash')
					.setTooltip(t('settingsCategoryDeleteTooltip'))
					.onClick(async () => {
						this.plugin.settings.categories = this.plugin.settings.categories.filter((c) => c.id !== cat.id);
						await this.plugin.saveSettings();
						this.display();
					})
			);

		const offsetsRow = box.createDiv({ cls: 'spaced-review-offsets-row' });
		offsetsRow.createSpan({ text: t('settingsOffsetsLabel') });
		cat.offsets.forEach((offset, idx) => {
			// Each number input + its own remove button live in a tight
			// "group" so they read as one unit, with a bigger gap between
			// groups than within one.
			const group = offsetsRow.createDiv({ cls: 'spaced-review-offset-group' });
			const input = group.createEl('input', { type: 'number', value: String(offset) });
			input.style.width = '4.5em';
			input.addEventListener('change', async () => {
				const n = parseInt(input.value, 10);
				if (!isNaN(n) && n > 0) {
					cat.offsets[idx] = n;
					cat.offsets.sort((a, b) => a - b);
					await this.plugin.saveSettings();
					// Re-render: sorting just moved this value to a different
					// position, so the DOM must be rebuilt now, otherwise the
					// *next* click on any "x" button - captured with the old,
					// now-stale idx - would delete the wrong offset.
					this.display();
				}
			});
			const removeBtn = group.createEl('button', { text: 'x' });
			removeBtn.addEventListener('click', async () => {
				cat.offsets.splice(idx, 1);
				await this.plugin.saveSettings();
				this.display();
			});
		});
		const addBtn = offsetsRow.createEl('button', { text: '+ J' });
		addBtn.addEventListener('click', async () => {
			cat.offsets.push((cat.offsets[cat.offsets.length - 1] ?? 0) + 10);
			await this.plugin.saveSettings();
			this.display();
		});
	}
}
