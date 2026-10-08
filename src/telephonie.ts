import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import type { paths } from './generated/api.js';
import { operatorFor } from './operateurs.js';

type ApiPhoneAnalysis = paths['/v1/telephone/analyse']['get']['responses'][200]['content']['application/json'];
// The contract types operator as always present; the API answers null for a non-Senegalese number.
export type PhoneAnalysis = Omit<ApiPhoneAnalysis, 'operator'> & { operator: ApiPhoneAnalysis['operator'] | null };

// Same text and rules as the phone analysis in server/internal/api/telephone.go; the parity test compares both.
const PORTABILITY_NOTICE =
	"Indicatif : l'opérateur est déduit du préfixe d'origine. Avec la portabilité, un abonné peut avoir changé d'opérateur en gardant son numéro.";

/** Offline equivalent of GET /v1/telephone/analyse; null when the input is not a phone number (the API answers 400 invalid_phone). */
export function analysePhone(input: string): PhoneAnalysis | null {
	const phone = parsePhoneNumberFromString(input, 'SN');
	if (!phone) return null;
	const senegalese = phone.country === 'SN' || phone.countryCallingCode === '221';
	const match = senegalese ? operatorFor(phone.nationalNumber) : null;
	return {
		input,
		valid: phone.isValid(),
		country: phone.country ?? null,
		senegalese,
		type: phone.getType() ?? null,
		e164: phone.number,
		national: phone.formatNational(),
		international: phone.formatInternational(),
		operator: match ? { name: match.operator, prefix: match.prefix, type: match.type, sources: match.sources } : null,
		notice: PORTABILITY_NOTICE,
	};
}
