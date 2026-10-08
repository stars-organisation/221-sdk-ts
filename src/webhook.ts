import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Checks X-221-Signature (`v1=` + hex HMAC-SHA256 of `<timestamp>.<raw body>`) against X-221-Timestamp (Unix seconds).
 * Pass the body exactly as received, before any JSON parsing. Rejects timestamps older (or later) than maxAgeSeconds.
 */
export function verifyWebhook(secret: string, timestampHeader: string, rawBody: string | Uint8Array, signatureHeader: string, maxAgeSeconds = 300): boolean {
	if (!/^\d+$/.test(timestampHeader) || Math.abs(Date.now() / 1000 - Number(timestampHeader)) > maxAgeSeconds) return false;
	const expected = Buffer.from(`v1=${createHmac('sha256', secret).update(`${timestampHeader}.`).update(rawBody).digest('hex')}`);
	const received = Buffer.from(signatureHeader);
	return received.length === expected.length && timingSafeEqual(received, expected);
}
