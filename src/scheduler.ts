import { ReviewItem, ReviewCategory, Occurrence } from './types';
import { addDays } from './utils';

/**
 * Computes every occurrence for a single item, applying any stored overrides
 * (i.e. dates the user moved via drag & drop) on top of the offsets defined
 * by its category. This is always recomputed from settings + markedDate, so
 * editing a category's offsets in the settings immediately updates the
 * planning for every item using it, per spec.
 */
export function computeOccurrences(item: ReviewItem, category: ReviewCategory): Occurrence[] {
	const overrideMap = new Map(item.overrides.map((o) => [o.index, o.date]));
	return category.offsets.map((offset, index) => {
		const computed = addDays(item.markedDate, offset);
		const overridden = overrideMap.get(index);
		return {
			item,
			category,
			index,
			offset,
			date: overridden ?? computed,
			moved: overridden != null && overridden !== computed,
			completed: offset <= item.completedThroughOffset,
		};
	});
}

/** Groups every occurrence of every item by ISO date. */
export function buildPlanning(items: ReviewItem[], categories: ReviewCategory[]): Map<string, Occurrence[]> {
	const byId = new Map(categories.map((c) => [c.id, c]));
	const planning = new Map<string, Occurrence[]>();
	for (const item of items) {
		const cat = byId.get(item.categoryId);
		if (!cat) continue; // orphaned item (category was deleted)
		for (const occ of computeOccurrences(item, cat)) {
			const list = planning.get(occ.date) ?? [];
			list.push(occ);
			planning.set(occ.date, list);
		}
	}
	return planning;
}
