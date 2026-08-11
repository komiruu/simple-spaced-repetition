export interface ReviewCategory {
	id: string;
	name: string;
	/** Displayed in front of the occurrence number, e.g. "m3". Should be unique. */
	letter: string;
	/** Days after the "marked" date, ascending, e.g. [2, 7, 20, 60, 180]. */
	offsets: number[];
}

export interface ReviewOverride {
	/** 0-based index into the category's offsets array. */
	index: number;
	/** ISO date (YYYY-MM-DD) this occurrence was moved to. */
	date: string;
}

export interface ReviewItem {
	id: string;
	filePath: string;
	/** Heading text, or undefined if the whole file was marked. */
	header?: string;
	categoryId: string;
	/** ISO date (YYYY-MM-DD) the item was marked for review. */
	markedDate: string;
	overrides: ReviewOverride[];
	/**
	 * Completion "watermark": every occurrence whose raw category offset
	 * (its J+N, not its calendar date) is <= this value counts as done.
	 * 0 means nothing is done yet. Tracking by offset value rather than by
	 * array index survives inserting/removing OTHER offsets in the
	 * category, and is unaffected by drag-and-drop date overrides, which
	 * only change an occurrence's displayed date, not its offset identity.
	 */
	completedThroughOffset: number;
}

export interface SpacedReviewSettings {
	categories: ReviewCategory[];
	/** Path, inside the vault, to the single Markdown file used as storage. */
	vaultFilePath: string;
	showEmptyDays: boolean;
	showAllUntilLast: boolean;
	horizonDays: number;
}

export const DEFAULT_SETTINGS: SpacedReviewSettings = {
	categories: [
		{ id: 'mineure', name: 'Mineure', letter: 'm', offsets: [2, 7, 20, 60, 180] },
		{ id: 'majeure', name: 'Majeure', letter: 'M', offsets: [10, 30, 90, 270] },
	],
	vaultFilePath: 'Revisions/planning.md',
	showEmptyDays: true,
	showAllUntilLast: false,
	horizonDays: 14,
};

/** A single resolved occurrence of a review, ready to be placed on the planning. */
export interface Occurrence {
	item: ReviewItem;
	category: ReviewCategory;
	/** 0-based index into the category's offsets array (current array shape). */
	index: number;
	/** Raw category offset (days) for this slot - stable identity for completion tracking. */
	offset: number;
	/** ISO date (YYYY-MM-DD), resolved from override or computed from offsets. */
	date: string;
	moved: boolean;
	completed: boolean;
}
