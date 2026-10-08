// node examples/premier-appel.mjs (after npm run build; API_KEY and API_URL optional)
import { createApiClient } from '@orvlabs/sdk-221';
import { places } from '@orvlabs/sdk-221/offline';

const api = createApiClient({ apiKey: process.env.API_KEY, baseUrl: process.env.API_URL });
const { data, error, response } = await api.GET('/v1/jours-feries', { params: { query: { year: '2026' } } });
if (error) {
	const retry = response.status === 429 ? ` (réessayez dans ${response.headers.get('Retry-After')} s)` : '';
	console.error(`${response.status} ${error.error.code} : ${error.error.message}${retry}`);
} else {
	const [first] = data.data;
	console.log('En ligne :', `${data.pagination.total} jours fériés en 2026, le premier : ${first.date} ${first.name.fr} (${first.date_status})`, `quota restant ${response.headers.get('RateLimit-Remaining')}`);
}

console.log('Hors ligne :', places({ level: 'region', q: 'thies' })[0]?.name);
