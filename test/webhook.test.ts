import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhook } from '../src/webhook.js';

const secret = 'whsec_test';
const body = '{"id":"evt_1","type":"payment.succeeded"}';
const sign = (timestamp: string) => `v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
const now = () => String(Math.floor(Date.now() / 1000));

describe('verifyWebhook', () => {
	it('accepts a fresh, correctly signed delivery', () => {
		const ts = now();
		expect(verifyWebhook(secret, ts, body, sign(ts))).toBe(true);
		expect(verifyWebhook(secret, ts, Buffer.from(body), sign(ts))).toBe(true);
	});

	it('rejects a tampered body, a wrong secret, a malformed header and a stale timestamp', () => {
		const ts = now();
		expect(verifyWebhook(secret, ts, `${body} `, sign(ts))).toBe(false);
		expect(verifyWebhook('autre', ts, body, sign(ts))).toBe(false);
		expect(verifyWebhook(secret, ts, body, 'v1=00')).toBe(false);
		expect(verifyWebhook(secret, ts, body, '')).toBe(false);
		const old = String(Number(ts) - 301);
		expect(verifyWebhook(secret, old, body, sign(old))).toBe(false);
		expect(verifyWebhook(secret, old, body, sign(old), 600)).toBe(true);
	});
});
