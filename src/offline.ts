import type { components } from './generated/api.js';
import data from './generated/data.json' with { type: 'json' };

export type JourFerie = (typeof data)['jours-feries'][number];
export type Banque = (typeof data)['banques'][number];
export type Lieu = components['schemas']['Lieu'];
export { operatorFor, type PrefixeOperateur } from './operateurs.js';

const joursFeries = data['jours-feries'] as JourFerie[];
const banques = data.banques as Banque[];
const lieux = data.geographie as Lieu[];

/** Version of the embedded reference data: refreshed with each SDK release. */
export const snapshot = { built_at: data.built_at, api_version: data.api_version, geographie: data.geographie_meta };
const holidayYears = [...new Set(joursFeries.map((h) => h.date.slice(0, 4)))];

// Copy of normalize() in server/internal/api/data.go (itself the search_key rule of data/src/geographie/lieux.py).
export const normalize = (value: string) =>
	value
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/['’‘`ʼ]/g, '')
		.replace(/œ/g, 'oe')
		.replace(/æ/g, 'ae')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

/** Throws a RangeError for a year outside the embedded data: ask GET /v1/jours-feries?year= instead. */
export function holidays(year?: string | number) {
	if (!year) return joursFeries;
	const found = joursFeries.filter((h) => h.date.startsWith(String(year)));
	if (!found.length) throw new RangeError(`Aucun jour férié embarqué pour ${year} (années : ${holidayYears.join(', ')}). Interrogez GET /v1/jours-feries?year=${year}.`);
	return found;
}

export const holiday = (isoDate: string) => joursFeries.find((h) => h.date === isoDate) ?? null;

export const banks = (q?: string) => (q ? banques.filter((b) => normalize(JSON.stringify(b)).includes(normalize(q))) : banques);

/** By id (« k0010a ») or BCEAO bank code (« K 0010 A »). */
export const bank = (idOrCode: string) => banques.find((b) => b.id === idOrCode || b.bank_code === idOrCode) ?? null;

/** Same filters and ranking as GET /v1/geographie, without pagination. */
export function places({ level, parent_id, q }: { level?: Lieu['level']; parent_id?: string; q?: string } = {}) {
	const needle = q ? normalize(q) : '';
	const matches = lieux.filter(
		(p) =>
			(!level || p.level === level) &&
			(!parent_id || p.parent_id === parent_id) &&
			(!needle || p.search_key.includes(needle) || normalize(p.name ?? '').includes(needle)),
	);
	if (!needle) return matches;
	const rank = (p: Lieu) => (p.search_key === needle ? 0 : p.search_key.startsWith(needle) ? 1 : 2);
	return matches.sort((a, b) => rank(a) - rank(b));
}

/** Same shape as GET /v1/geographie/{id}: the place with its ancestors (region first) and children. */
export function place(id: string) {
	const found = lieux.find((p) => p.id === id);
	if (!found) return null;
	const ancestors: Lieu[] = [];
	for (let parent = found.parent_id; parent; ) {
		const next = lieux.find((p) => p.id === parent);
		if (!next) break;
		ancestors.unshift(next);
		parent = next.parent_id;
	}
	return { ...found, ancestors, children: lieux.filter((p) => p.parent_id === id) };
}
