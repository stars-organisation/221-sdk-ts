import createClient, { type ClientOptions } from 'openapi-fetch';
import type { paths } from './generated/api.js';

export type { components, paths } from './generated/api.js';

export const DEFAULT_BASE_URL = 'https://apps.orvlabs.com';

export type ApiClientOptions = ClientOptions & { apiKey?: string };

/** Typed client of every route of the OpenAPI document; without apiKey, calls use the low anonymous quota per IP. */
export function createApiClient({ apiKey, baseUrl = DEFAULT_BASE_URL, headers, ...options }: ApiClientOptions = {}) {
	return createClient<paths>({
		...options,
		baseUrl,
		headers: apiKey ? { ...headers, Authorization: `Bearer ${apiKey}` } : headers,
	});
}

export type ApiClient = ReturnType<typeof createApiClient>;
