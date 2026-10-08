import { toCardinal } from 'n2words/fr';
import type { paths } from './generated/api.js';

export type FormattedAmount = paths['/v1/monnaie/format']['get']['responses'][200]['content']['application/json'];

// Same rules as formatAmount() in server/internal/api/montant.go; the parity test compares both.
export const EUR_PARITY = 655.957;

const groupDigits = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value).replace(/\s/g, ' ');

/** Offline equivalent of GET /v1/monnaie/format: « 1 250 000 FCFA », amount in words and in euros (fixed parity). */
export function formatAmount(amount: number): FormattedAmount {
	if (!Number.isFinite(amount) || Math.abs(amount) > 1e15) throw new RangeError(`Montant invalide : ${amount}`);
	const rounded = Math.round(amount);
	const number = toCardinal(Math.abs(rounded));
	const unit = Math.abs(rounded) < 2 ? 'franc CFA' : /(millions?|milliards?)$/.test(number) ? 'de francs CFA' : 'francs CFA';
	const words = `${number} ${unit}`;
	return {
		amount: rounded,
		currency: 'XOF',
		formatted: `${groupDigits(rounded)} FCFA`,
		words: rounded < 0 ? `moins ${words}` : words,
		eur: Math.round((rounded / EUR_PARITY) * 100) / 100,
		eur_parity: EUR_PARITY,
	};
}
