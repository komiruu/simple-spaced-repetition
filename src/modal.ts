import { App, Modal, Setting } from 'obsidian';
import { ReviewCategory } from './types';
import { t } from './i18n';

export class CategoryPickModal extends Modal {
	private categories: ReviewCategory[];
	private onPick: (categoryId: string) => void;

	constructor(app: App, categories: ReviewCategory[], onPick: (categoryId: string) => void) {
		super(app);
		this.categories = categories;
		this.onPick = onPick;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: t('modalTitle') });
		for (const cat of this.categories) {
			new Setting(contentEl).setName(`${cat.name} (${cat.letter})`).addButton((b) =>
				b
					.setButtonText(t('modalChooseButton'))
					.setCta()
					.onClick(() => {
						this.onPick(cat.id);
						this.close();
					})
			);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
