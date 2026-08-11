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

const FR_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const FR_MONTHS = [
	'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
	'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** e.g. "lundi 07 septembre" */
export function frDayLabel(iso: string): string {
	const d = fromISO(iso);
	return `${FR_DAYS[d.getDay()]} ${pad2(d.getDate())} ${FR_MONTHS[d.getMonth()]}`;
}

/** e.g. "07/09/2026" */
export function frDateShort(iso: string): string {
	const d = fromISO(iso);
	return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Parses "DD/MM/YYYY" into an ISO date, or null if invalid. */
export function parseFrDate(s: string): string | null {
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
