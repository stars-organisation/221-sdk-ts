import operateurs from './generated/operateurs.json' with { type: 'json' };

export type PrefixeOperateur = (typeof operateurs)[number];

/** Operator of origin of a national number (9 digits, without +221): longest matching prefix. */
export const operatorFor = (nationalNumber: string) =>
	operateurs.filter((p) => nationalNumber.startsWith(p.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0] ?? null;
