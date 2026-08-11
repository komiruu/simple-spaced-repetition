import { App, PluginSettingTab, Setting } from 'obsidian';
import type SpacedReviewPlugin from './main';
import { ReviewCategory } from './types';
import { generateId } from './utils';

export class SpacedReviewSettingTab extends PluginSettingTab {
	plugin: SpacedReviewPlugin;

	constructor(app: App, plugin: SpacedReviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Revisions espacees' });

		new Setting(containerEl)
			.setName('Fichier de sauvegarde')
			.setDesc(
				'Fichier Markdown du vault ou sont stockes les rappels. Vous pouvez l\'ouvrir et l\'editer ' +
					'directement. ' +
					'Le plugin n\'ecrit que dans une section marquée du fichier et ne touche jamais au reste ' +
					'même si vous pointez vers une note existante.\n' +
					'Attention : pensez à ajouter .md à la fin du fichier.'
			)
			.addText((text) => {
				text.setValue(this.plugin.settings.vaultFilePath);
				// Committed on blur rather than per-keystroke: writing on every
				// character typed would otherwise touch a different (partial,
				// unintended) path on each keystroke.
				text.inputEl.addEventListener('blur', async () => {
					const newPath = text.inputEl.value.trim();
					if (!newPath || newPath === this.plugin.settings.vaultFilePath) return;
					this.plugin.settings.vaultFilePath = newPath;
					// Adopt whatever the plugin already recognises at the new
					// path (if anything) instead of discarding it.
					await this.plugin.reloadFromFile();
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Afficher les jours vides')
			.setDesc("Affiche aussi les jours sans révision prevue, pour pouvoir y déposer un élément déplacé.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.showEmptyDays).onChange(async (v) => {
					this.plugin.settings.showEmptyDays = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Afficher tous les jours jusqu'au dernier rappel")
			.setDesc('Si désactivé, seule une fenêtre de jours (ci-dessous) est affichée.')
			.addToggle((t) =>
				t.setValue(this.plugin.settings.showAllUntilLast).onChange(async (v) => {
					this.plugin.settings.showAllUntilLast = v;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		if (!this.plugin.settings.showAllUntilLast) {
			new Setting(containerEl).setName('Fenêtre (en jours)').addText((text) =>
				text.setValue(String(this.plugin.settings.horizonDays)).onChange(async (v) => {
					const n = parseInt(v, 10);
					if (!isNaN(n) && n > 0) {
						this.plugin.settings.horizonDays = n;
						await this.plugin.saveSettings();
					}
				})
			);
		}

		containerEl.createEl('h3', { text: 'Categories de révision' });
		containerEl.createEl('p', {
			text:
				'Chaque catégorie a un nom, une lettre unique (affichee devant le numero de repetition, ' +
				'ex: "m3"), et une liste de delais en jours (J+...).',
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
				text: `Attention: lettre(s) utilisée(s) par plusieurs catégories: ${Array.from(duplicateLetters).join(', ')}`,
				cls: 'mod-warning',
			});
		}

		for (const cat of this.plugin.settings.categories) {
			this.renderCategory(containerEl, cat);
		}

		new Setting(containerEl).addButton((btn) =>
			btn.setButtonText('+ Ajouter une categorie').onClick(async () => {
				this.plugin.settings.categories.push({
					id: generateId(),
					name: 'Nouvelle categorie',
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
			.setName('Nom / lettre')
			.addText((t) => {
				t.setValue(cat.name).onChange(async (v) => {
					cat.name = v;
					await this.plugin.saveSettings();
				});
			})
			.addText((t) => {
				t.inputEl.maxLength = 3;
				t.inputEl.style.width = '3.5em';
				t.setValue(cat.letter).onChange(async (v) => {
					cat.letter = v.slice(0, 3) || cat.letter;
					await this.plugin.saveSettings();
				});
			})
			.addExtraButton((b) =>
				b
					.setIcon('trash')
					.setTooltip('Supprimer la categorie')
					.onClick(async () => {
						this.plugin.settings.categories = this.plugin.settings.categories.filter((c) => c.id !== cat.id);
						await this.plugin.saveSettings();
						this.display();
					})
			);

		const offsetsRow = box.createDiv({ cls: 'spaced-review-offsets-row' });
		offsetsRow.createSpan({ text: 'Rappels (J+) : ' });
		cat.offsets.forEach((offset, idx) => {
			// Each number input + its own remove button live in a tight
			// "group" so they read as one unit, with a bigger gap between
			// groups than within one - avoids the ambiguous even spacing.
			const group = offsetsRow.createDiv({ cls: 'spaced-review-offset-group' });
			const input = group.createEl('input', { type: 'number', value: String(offset) });
			input.style.width = '4.5em';
			input.addEventListener('change', async () => {
				const n = parseInt(input.value, 10);
				if (!isNaN(n) && n > 0) {
					cat.offsets[idx] = n;
					cat.offsets.sort((a, b) => a - b);
					await this.plugin.saveSettings();
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
