import { App, TFile } from 'obsidian';
import { ReviewItem, ReviewOverride, ReviewCategory } from './types';
import { generateId, formatDateShort, parseShortDate, toWikilinkPath, normalizeNotePath } from './utils';

/**
 * The plugin never touches anything in the save file outside of these
 * markers: on write, it either replaces only the text between them, or - if
 * they aren't found yet (fresh file, or an existing note the user pointed
 * the plugin at) - appends a fresh marked block at the very end, without
 * altering a single character of whatever was already there.
 */
const START_MARKER = '<!-- spaced-review-plugin:start -->';
const END_MARKER = '<!-- spaced-review-plugin:end -->';

/**
 * Entry format - designed to degrade gracefully instead of corrupting:
 * a new entry starts as soon as a line containing a wikilink is found
 * (optionally prefixed by a Markdown heading marker, for older files or if
 * you add one yourself - a bare "[[...]]" line is what's generated now, so
 * it doesn't render as a big bold heading); every other line is matched
 * independently by its own prefix, in any order, and unrecognised lines are
 * simply skipped.
 *
 *   [[Note#Header]]
 *   Added to Mineure on the 01/08/2026
 *   - 2 to 10/08/2026
 *   > Completed until J+20
 *
 *   [[Autre note]]
 *   Added to Majeure on the 01/07/2026
 *
 * - Link line: a wikilink to the file, or file#header for a header.
 * - "added to <category> on the <DD/MM/YYYY>": when it was marked, and
 *   which configured category it belongs to.
 * - "- <n> to <DD/MM/YYYY>": the n-th repetition (1-indexed, matching what's
 *   shown in the planning) was dragged to that date.
 * - "> Completed until J+<n>": every repetition due at J+n or earlier is
 *   considered done (a watermark, not a per-repetition list - see
 *   completedThroughOffset in types.ts for why).
 */

const ENTRY_START_RE = /^(?:#{1,6}\s+)?\[\[([^\]]+)\]\]/;
const ADDED_RE = /^added to (.+) on the (\d{1,2}\/\d{1,2}\/\d{4})/i;
const MOVE_RE = /^-\s*(\d+)\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i;
const COMPLETED_RE = /^>\s*Completed until J\+(\d+)/i;

interface DraftItem {
	filePath: string;
	header?: string;
	categoryName?: string;
	markedDate?: string;
	overrides: ReviewOverride[];
	completedThroughOffset: number;
}

function finalizeDraft(draft: DraftItem, categories: ReviewCategory[]): ReviewItem | null {
	if (!draft.categoryName || !draft.markedDate) return null;
	const cat = categories.find((c) => c.name.trim() === draft.categoryName);
	if (!cat) return null;
	return {
		id: generateId(),
		filePath: draft.filePath,
		header: draft.header,
		categoryId: cat.id,
		markedDate: draft.markedDate,
		overrides: draft.overrides,
		completedThroughOffset: draft.completedThroughOffset,
	};
}

export function parseItemsFromContent(content: string, categories: ReviewCategory[]): ReviewItem[] {
	const lines = content.split('\n');
	const items: ReviewItem[] = [];
	let draft: DraftItem | null = null;

	const flush = () => {
		if (draft) {
			const item = finalizeDraft(draft, categories);
			if (item) items.push(item);
		}
		draft = null;
	};

	for (const rawLine of lines) {
		const line = rawLine.trim();

		const entryMatch = line.match(ENTRY_START_RE);
		if (entryMatch) {
			flush();
			const inner = entryMatch[1];
			const hashIdx = inner.indexOf('#');
			const filePath = normalizeNotePath((hashIdx >= 0 ? inner.slice(0, hashIdx) : inner).trim());
			const header = hashIdx >= 0 ? inner.slice(hashIdx + 1).trim() : undefined;
			draft = { filePath, header, overrides: [], completedThroughOffset: 0 };
			continue;
		}

		if (!draft) continue; // stray line before any entry: ignore

		const addedMatch = line.match(ADDED_RE);
		if (addedMatch) {
			draft.categoryName = addedMatch[1].trim();
			const iso = parseShortDate(addedMatch[2]);
			if (iso) draft.markedDate = iso;
			continue;
		}

		const moveMatch = line.match(MOVE_RE);
		if (moveMatch) {
			const idx = Number(moveMatch[1]) - 1;
			const iso = parseShortDate(moveMatch[2]);
			if (iso && idx >= 0) draft.overrides.push({ index: idx, date: iso });
			continue;
		}

		const completedMatch = line.match(COMPLETED_RE);
		if (completedMatch) {
			const n = parseInt(completedMatch[1], 10);
			if (!isNaN(n) && n > draft.completedThroughOffset) draft.completedThroughOffset = n;
			continue;
		}

		// Unrecognised line (blank line, free-form note, stray text): skip
		// without aborting the rest of the parse.
	}
	flush();
	return items;
}

function serializeItem(item: ReviewItem, categoryName: string): string {
	const displayPath = toWikilinkPath(item.filePath);
	const link = item.header ? `[[${displayPath}#${item.header}]]` : `[[${displayPath}]]`;
	const lines = [link, `Added to ${categoryName} on the ${formatDateShort(item.markedDate)}`];
	for (const o of item.overrides) {
		lines.push(`- ${o.index + 1} to ${formatDateShort(o.date)}`);
	}
	if (item.completedThroughOffset > 0) {
		lines.push(`> Completed until J+${item.completedThroughOffset}`);
	}
	return lines.join('\n');
}

export function serializeItems(items: ReviewItem[], categories: ReviewCategory[]): string {
	const nameById = new Map(categories.map((c) => [c.id, c.name]));
	const blocks = items.map((item) => serializeItem(item, nameById.get(item.categoryId) ?? 'Inconnue'));
	return blocks.length > 0 ? blocks.join('\n\n') + '\n' : '';
}

/** Returns just the text the plugin owns and parses - between the markers
 * if present, or the whole file for a legacy/fresh file that has none yet. */
function extractManagedSection(content: string): string {
	const startIdx = content.indexOf(START_MARKER);
	const endIdx = content.indexOf(END_MARKER);
	if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
		return content.slice(startIdx + START_MARKER.length, endIdx);
	}
	return content;
}

/** Splices the newly serialised items back into the file: replaces only the
 * marked section if one exists, otherwise appends a brand new marked block
 * after whatever content is already there. Never removes or rewrites
 * anything outside the markers. */
function spliceManagedSection(existingContent: string, newBody: string): string {
	const managedBlock = `${START_MARKER}\n${newBody}${newBody ? '\n' : ''}${END_MARKER}\n`;

	const startIdx = existingContent.indexOf(START_MARKER);
	const endIdx = existingContent.indexOf(END_MARKER);
	if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
		const before = existingContent.slice(0, startIdx);
		const after = existingContent.slice(endIdx + END_MARKER.length);
		return `${before}${managedBlock}${after}`;
	}

	if (existingContent.trim().length === 0) return managedBlock;
	const separator = existingContent.endsWith('\n\n') ? '' : existingContent.endsWith('\n') ? '\n' : '\n\n';
	return `${existingContent}${separator}${managedBlock}`;
}

export async function loadItemsFromVaultFile(
	app: App,
	path: string,
	categories: ReviewCategory[]
): Promise<ReviewItem[]> {
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) return [];
	const content = await app.vault.read(file);
	return parseItemsFromContent(extractManagedSection(content), categories);
}

export async function saveItemsToVaultFile(
	app: App,
	path: string,
	items: ReviewItem[],
	categories: ReviewCategory[]
): Promise<void> {
	const newBody = serializeItems(items, categories);

	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		const currentContent = await app.vault.read(existing);
		const newContent = spliceManagedSection(currentContent, newBody);
		await app.vault.modify(existing, newContent);
		return;
	}

	const folder = path.substring(0, path.lastIndexOf('/'));
	if (folder && !app.vault.getAbstractFileByPath(folder)) {
		await app.vault.createFolder(folder).catch(() => {
			/* folder may already exist due to a race, ignore */
		});
	}
	await app.vault.create(path, spliceManagedSection('', newBody));
}
