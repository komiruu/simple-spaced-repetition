import { ItemView, WorkspaceLeaf, DropdownComponent, Notice, Menu, TFile, MarkdownView, setIcon } from 'obsidian';
import type SpacedReviewPlugin from './main';
import { buildPlanning } from './scheduler';
import { Occurrence } from './types';
import { todayISO, addDays, dayLabel, formatDateShort, escapeRegExp } from './utils';
import { t, getLang } from './i18n';

export const VIEW_TYPE_SPACED_REVIEW = 'spaced-review-planning-view';

export class SpacedReviewView extends ItemView {
	plugin: SpacedReviewPlugin;
	private selectedCategoryId: string | undefined;
	private lastHighlighted: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: SpacedReviewPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_SPACED_REVIEW;
	}

	getDisplayText() {
		return t('viewDisplayText');
	}

	getIcon() {
		return 'calendar-clock';
	}

	async onOpen() {
		// Always start from what's actually on disk, in case the file was
		// edited while the panel was closed.
		await this.plugin.reloadFromFile();
		this.render();
	}

	async onClose() {
		// nothing to clean up
	}

	render() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('spaced-review-container');

		this.renderToolbar(container);

		const planningEl = container.createDiv({ cls: 'spaced-review-planning' });
		this.renderPlanning(planningEl);
	}

	/**
	 * Three stacked rows so nothing gets cramped in a narrow sidebar:
	 * 1. category picker, centred
	 * 2. "mark this file" button, centred
	 * 3. empty-days toggle (left) / reload button (right)
	 */
	private renderToolbar(container: HTMLElement) {
		const toolbar = container.createDiv({ cls: 'spaced-review-toolbar' });

		if (this.selectedCategoryId === undefined) {
			this.selectedCategoryId = this.plugin.settings.categories[0]?.id;
		}

		const row1 = toolbar.createDiv({ cls: 'spaced-review-toolbar-row spaced-review-toolbar-row-center' });
		if (this.plugin.settings.categories.length > 0) {
			const dropdown = new DropdownComponent(row1);
			for (const cat of this.plugin.settings.categories) {
				dropdown.addOption(cat.id, cat.name);
			}
			if (this.selectedCategoryId) dropdown.setValue(this.selectedCategoryId);
			dropdown.onChange((v) => {
				this.selectedCategoryId = v;
			});
		}

		const row2 = toolbar.createDiv({ cls: 'spaced-review-toolbar-row spaced-review-toolbar-row-center' });
		const markBtn = row2.createEl('button', { text: t('markFileButton'), cls: 'mod-cta' });
		markBtn.addEventListener('click', async () => {
			const file = this.app.workspace.getActiveFile();
			if (!file) {
				new Notice(t('noticeNoActiveFile'));
				return;
			}
			if (!this.selectedCategoryId) {
				new Notice(t('noticeNoCategoriesView'));
				return;
			}
			await this.plugin.markForReview(file.path, undefined, this.selectedCategoryId);
		});

		const row3 = toolbar.createDiv({ cls: 'spaced-review-toolbar-row spaced-review-toolbar-row-split' });

		const toggleLabel = row3.createEl('label', { cls: 'spaced-review-toggle' });
		const toggle = toggleLabel.createEl('input', { type: 'checkbox' });
		toggle.checked = this.plugin.settings.showEmptyDays;
		toggleLabel.appendText(` ${t('toggleEmptyDaysLabel')}`);
		toggle.addEventListener('change', async () => {
			this.plugin.settings.showEmptyDays = toggle.checked;
			await this.plugin.saveSettings();
			this.render();
		});

		const reloadBtn = row3.createEl('button', { cls: 'clickable-icon' });
		setIcon(reloadBtn, 'refresh-cw');
		reloadBtn.setAttribute('aria-label', t('reloadAriaLabel'));
		reloadBtn.addEventListener('click', async () => {
			await this.plugin.reloadFromFile();
			this.render();
			new Notice(t('noticeReloaded'));
		});
	}

	private renderPlanning(planningEl: HTMLElement) {
		const planning = buildPlanning(this.plugin.items, this.plugin.settings.categories);
		const today = todayISO();
		const lang = getLang();

		// Everything before today that hasn't been checked off, grouped
		// together instead of one row per past day so an old backlog
		// doesn't flood the view. Completed past occurrences are simply
		// dropped from view - the file still keeps their record.
		const overdueDates = Array.from(planning.keys())
			.filter((d) => d < today)
			.sort();
		const stillDue: Occurrence[] = [];
		for (const d of overdueDates) {
			for (const occ of planning.get(d) ?? []) {
				if (!occ.completed) stillDue.push(occ);
			}
		}
		if (stillDue.length > 0) {
			const section = planningEl.createDiv({ cls: 'spaced-review-day is-overdue-section' });
			section.setAttribute('data-date', today);
			section.createDiv({ cls: 'spaced-review-day-label', text: t('dayLabelStillDue') });
			const listEl = section.createDiv({ cls: 'spaced-review-day-list' });
			for (const occ of stillDue) {
				this.renderItemRow(listEl, occ, true);
			}
		}

		const futureDates = Array.from(planning.keys())
			.filter((d) => d >= today)
			.sort();
		const end = this.plugin.settings.showAllUntilLast
			? futureDates[futureDates.length - 1] ?? addDays(today, this.plugin.settings.horizonDays)
			: addDays(today, this.plugin.settings.horizonDays);

		let cursor = today;
		while (cursor <= end) {
			const occs = (planning.get(cursor) ?? []).sort((a, b) => a.category.letter.localeCompare(b.category.letter));
			if (occs.length > 0 || this.plugin.settings.showEmptyDays) {
				const dayEl = planningEl.createDiv({ cls: 'spaced-review-day' });
				if (cursor === today) dayEl.addClass('is-today');
				dayEl.setAttribute('data-date', cursor);

				const label = this.capitalize(dayLabel(cursor, lang)) + (cursor === today ? t('todaySuffix') : '');
				dayEl.createDiv({ cls: 'spaced-review-day-label', text: label });

				const listEl = dayEl.createDiv({ cls: 'spaced-review-day-list' });
				for (const occ of occs) this.renderItemRow(listEl, occ, false);
			}
			cursor = addDays(cursor, 1);
		}
	}

	private capitalize(s: string) {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	private renderItemRow(listEl: HTMLElement, occ: Occurrence, showDate: boolean) {
		const row = listEl.createDiv({ cls: 'spaced-review-item' });
		if (occ.completed) row.addClass('is-completed');

		row.createSpan({ cls: 'spaced-review-item-badge', text: `${occ.category.letter}${occ.index + 1}` });

		const title = occ.item.header ?? occ.item.filePath.replace(/\.md$/, '');
		row.createSpan({ cls: 'spaced-review-item-title', text: title });

		if (showDate) row.createSpan({ cls: 'spaced-review-item-date', text: formatDateShort(occ.date) });
		if (occ.moved) row.createSpan({ cls: 'spaced-review-item-moved', text: t('itemMovedSuffix') });

		const checkbox = row.createEl('input', { type: 'checkbox', cls: 'spaced-review-item-checkbox' });
		checkbox.checked = occ.completed;
		checkbox.addEventListener('click', (evt) => evt.stopPropagation());
		checkbox.addEventListener('pointerdown', (evt) => evt.stopPropagation());
		checkbox.addEventListener('change', async () => {
			await this.plugin.toggleCompleted(occ.item.id, occ.offset);
		});

		row.addEventListener('click', async (evt: MouseEvent) => {
			const newTab = evt.ctrlKey || evt.metaKey;
			await this.openOccurrence(occ, newTab);
		});

		row.addEventListener('contextmenu', (evt) => {
			evt.preventDefault();
			const menu = new Menu();
			menu.addItem((mi) =>
				mi
					.setTitle(t('contextMenuDelete'))
					.setIcon('trash')
					.onClick(async () => {
						await this.plugin.removeItem(occ.item.id);
					})
			);
			menu.showAtMouseEvent(evt);
		});

		this.makeDraggable(row, occ);
	}

	private async openOccurrence(occ: Occurrence, newTab: boolean) {
		const file = this.app.vault.getAbstractFileByPath(occ.item.filePath);
		if (!(file instanceof TFile)) {
			new Notice(t('noticeFileNotFound', { path: occ.item.filePath }));
			return;
		}
		const leaf = this.app.workspace.getLeaf(newTab);
		await leaf.openFile(file);

		if (occ.item.header) {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			const re = new RegExp(`^#{1,6}\\s+${escapeRegExp(occ.item.header)}\\s*$`);
			const idx = lines.findIndex((l) => re.test(l.trim()));
			if (idx >= 0) {
				const view = leaf.view;
				if (view instanceof MarkdownView) {
					view.editor.setCursor({ line: idx, ch: 0 });
					view.editor.scrollIntoView({ from: { line: idx, ch: 0 }, to: { line: idx, ch: 0 } }, true);
				}
			}
		}
	}

	// --- Drag and drop, implemented with Pointer Events so it works with
	// both mouse (desktop) and touch (mobile) input. ---

	private makeDraggable(el: HTMLElement, occ: Occurrence) {
		el.addEventListener('pointerdown', (evt: PointerEvent) => {
			if (evt.pointerType === 'mouse' && evt.button !== 0) return;

			const startX = evt.clientX;
			const startY = evt.clientY;
			let dragging = false;
			let ghost: HTMLElement | null = null;

			const onMove = (moveEvt: PointerEvent) => {
				const dx = moveEvt.clientX - startX;
				const dy = moveEvt.clientY - startY;
				if (!dragging && Math.hypot(dx, dy) > 8) {
					dragging = true;
					el.addClass('is-dragging');
					ghost = el.cloneNode(true) as HTMLElement;
					ghost.addClass('spaced-review-drag-ghost');
					document.body.appendChild(ghost);
					this.positionGhost(ghost, moveEvt.clientX, moveEvt.clientY);
				}
				if (dragging && ghost) {
					moveEvt.preventDefault();
					this.positionGhost(ghost, moveEvt.clientX, moveEvt.clientY);
					this.highlightDropTarget(moveEvt.clientX, moveEvt.clientY);
				}
			};

			const onUp = (upEvt: PointerEvent) => {
				document.removeEventListener('pointermove', onMove);
				document.removeEventListener('pointerup', onUp);
				el.removeClass('is-dragging');

				if (dragging && ghost) {
					const target = this.getDropTargetDay(upEvt.clientX, upEvt.clientY);
					ghost.remove();
					this.clearDropHighlight();
					if (target && target !== occ.date) {
						this.plugin.moveOccurrence(occ.item.id, occ.index, target);
					}
					// Prevent the click event that follows a drag from
					// re-opening the file.
					const suppressClick = (ce: MouseEvent) => {
						ce.stopPropagation();
						ce.preventDefault();
						el.removeEventListener('click', suppressClick, true);
					};
					el.addEventListener('click', suppressClick, true);
				}
			};

			document.addEventListener('pointermove', onMove);
			document.addEventListener('pointerup', onUp);
		});
	}

	private positionGhost(ghost: HTMLElement, x: number, y: number) {
		ghost.style.position = 'fixed';
		ghost.style.left = `${x + 10}px`;
		ghost.style.top = `${y + 10}px`;
		ghost.style.pointerEvents = 'none';
		ghost.style.zIndex = '9999';
	}

	private highlightDropTarget(x: number, y: number) {
		this.clearDropHighlight();
		const el = this.elementAtPointExcludingGhost(x, y);
		const dayList = el?.closest('.spaced-review-day-list') as HTMLElement | null;
		if (dayList) {
			dayList.addClass('is-drop-target');
			this.lastHighlighted = dayList;
		}
	}

	private clearDropHighlight() {
		this.lastHighlighted?.removeClass('is-drop-target');
		this.lastHighlighted = null;
	}

	private elementAtPointExcludingGhost(x: number, y: number): HTMLElement | null {
		const els = document.elementsFromPoint(x, y) as HTMLElement[];
		return els.find((e) => !e.classList.contains('spaced-review-drag-ghost') && !e.closest('.spaced-review-drag-ghost')) ?? null;
	}

	private getDropTargetDay(x: number, y: number): string | null {
		const el = this.elementAtPointExcludingGhost(x, y);
		const dayEl = el?.closest('.spaced-review-day') as HTMLElement | null;
		return dayEl?.getAttribute('data-date') ?? null;
	}
}
