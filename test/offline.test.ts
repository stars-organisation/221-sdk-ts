import { describe, expect, it } from 'vitest';
import { formatAmount } from '../src/monnaie.js';
import { bank, holiday, holidays, operatorFor, place, places, snapshot } from '../src/offline.js';
import { analysePhone } from '../src/telephonie.js';

describe('offline helpers', () => {
	it('looks up the embedded reference data', () => {
		expect(snapshot.built_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(holiday('2026-04-04')).toMatchObject({ id: expect.any(String) });
		expect(operatorFor('771234567')?.operator).toBe('Orange (SONATEL)');
		expect(bank('K 0010 A')).toMatchObject({ id: 'k0010a' });
		expect(places({ level: 'region', q: 'thies' })[0]?.name).toBe('Thiès');
		expect(place('reg_om6lpn2l')?.children.length).toBeGreaterThan(0);
	});

	it('refuses holidays outside the embedded years instead of returning an empty list', () => {
		expect(holidays(2026).length).toBeGreaterThan(0);
		expect(() => holidays(2099)).toThrow(RangeError);
	});

	it('analyses phone numbers and formats amounts', () => {
		expect(analysePhone('+221 70 123 45 67')).toMatchObject({ valid: true, e164: '+221701234567', operator: { name: 'Expresso Sénégal' } });
		expect(analysePhone('abc')).toBeNull();
		expect(formatAmount(1250000)).toMatchObject({ formatted: '1 250 000 FCFA', words: 'un million deux cent cinquante mille francs CFA' });
		expect(() => formatAmount(Number.NaN)).toThrow(RangeError);
	});
});
