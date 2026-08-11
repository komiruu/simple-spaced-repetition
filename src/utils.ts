import { Lang } from './i18n';

function pad2(n: number): string {
	return n < 10 ? `0${n}` : `${n}`;
}

export function todayISO(): string {
	return toISO(new Date());
}

export function toISO(d: Date): string {
	const y = d.getFullYear();
	const m = pad2(d.getMonth() + 1);
	const day = pad2(d.getDate());
	return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
	const d = fromISO(iso);
	d.setDate(d.getDate() + days);
	return toISO(d);
}

const DAY_NAMES: Record<Lang, string[]> = {
	fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
	en: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
};

const MONTH_NAMES: Record<Lang, string[]> = {
	fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
	en: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
};

/** e.g. "lundi 07 septembre" / "monday 07 september" */
export function dayLabel(iso: string, lang: Lang): string {
	const d = fromISO(iso);
	return `${DAY_NAMES[lang][d.getDay()]} ${pad2(d.getDate())} ${MONTH_NAMES[lang][d.getMonth()]}`;
}

/** e.g. "07/09/2026" - used both for display and in the save file, independent of interface language. */
export function formatDateShort(iso: string): string {
	const d = fromISO(iso);
	return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Parses "DD/MM/YYYY" into an ISO date, or null if invalid. */
export function parseShortDate(s: string): string | null {
	const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (!m) return null;
	const dd = Number(m[1]);
	const mm = Number(m[2]);
	const yyyy = Number(m[3]);
	const d = new Date(yyyy, mm - 1, dd);
	return toISO(d);
}

export function generateId(): string {
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips the ".md" extension for display in a wikilink, the way Obsidian
 * itself omits it (`[[Note]]` rather than `[[Note.md]]`), while leaving any
 * other extension untouched (`[[image.png]]` stays as-is).
 */
export function toWikilinkPath(filePath: string): string {
	return /\.md$/i.test(filePath) ? filePath.slice(0, -3) : filePath;
}

/**
 * Reconstructs a real vault path from user-facing text that may be missing
 * its extension: appends ".md" if the last path segment has no extension at
 * all, mirroring how Obsidian resolves `[[Note]]` to `Note.md` while leaving
 * `[[image.png]]` (or a save-file path you typed with its extension) alone.
 */
export function normalizeNotePath(path: string): string {
	const lastSlash = path.lastIndexOf('/');
	const lastSegment = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
	if (lastSegment.includes('.')) return path;
	return `${path}.md`;
}
