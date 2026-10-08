import { describe, expect, it } from 'vitest';
import { createApiClient } from '../src/index.js';
import { formatAmount } from '../src/monnaie.js';
import { holidays, place } from '../src/offline.js';
import { analysePhone } from '../src/telephonie.js';

// Runs against the local Go API (make dev); API_URL overrides the default.
const api = createApiClient({ baseUrl: process.env.API_URL });

describe('client against the local API', () => {
	it('matches the offline phone and currency helpers', async () => {
		const phone = await api.GET('/v1/telephone/analyse', { params: { query: { numero: '77 123 45 67' } } });
		expect(phone.data).toEqual(analysePhone('77 123 45 67'));
		expect(phone.data?.operator?.name).toBe('Orange (SONATEL)');
		const amount = await api.GET('/v1/monnaie/format', { params: { query: { montant: 1250000 } } });
		expect(amount.data).toEqual(formatAmount(1250000));
		expect(amount.response.headers.get('RateLimit-Limit')).toBeTruthy();
	});

	it('serves the same reference data as the embedded snapshot', async () => {
		const { data } = await api.GET('/v1/jours-feries', { params: { query: { year: '2026', per_page: 100 } } });
		expect(data?.data).toEqual(holidays(2026));
		const dakar = await api.GET('/v1/geographie/{id}', { params: { path: { id: 'reg_om6lpn2l' } } });
		expect(dakar.data).toEqual(place('reg_om6lpn2l'));
	});

	it('returns typed errors', async () => {
		const missing = await api.GET('/v1/banques/{id}', { params: { path: { id: 'inconnue' } } });
		expect(missing.response.status).toBe(404);
		expect(missing.error?.code).toBe('NOT_FOUND');
		const badKey = await createApiClient({ baseUrl: process.env.API_URL, apiKey: 'cle-invalide' }).GET('/v1/categories');
		expect(badKey.response.status).toBe(401);
	});
});
