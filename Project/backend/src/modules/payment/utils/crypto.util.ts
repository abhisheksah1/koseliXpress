import crypto from 'crypto';

export function hmacSha256Base64(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64');
}

export function hmacSha512Hex(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data, 'utf-8').digest('hex');
}

export function calculateNpsSignature(payload: Record<string, unknown>, secretKey: string): string {
  const sortedKeys = Object.keys(payload)
    .filter((key) => key.toLowerCase() !== 'signature' && payload[key] !== undefined && payload[key] !== null)
    .sort();
  const concatenatedValues = sortedKeys.map((key) => String(payload[key])).join('');
  return hmacSha512Hex(concatenatedValues, secretKey);
}

export function generateEsewaSignature(
  amount: string,
  transactionUuid: string,
  productCode: string,
  secretKey: string,
): string {
  const dataString = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return hmacSha256Base64(dataString, secretKey);
}

/** Verify eSewa success redirect `data` payload per official signed_field_names spec */
export function verifyEsewaResponseSignature(
  payload: Record<string, unknown>,
  secretKey: string,
): boolean {
  const signedFieldNames = String(payload.signed_field_names || '');
  const providedSignature = String(payload.signature || '');
  if (!signedFieldNames || !providedSignature) return false;

  const names = signedFieldNames.split(',').map((s) => s.trim()).filter(Boolean);
  const dataString = names.map((name) => `${name}=${payload[name]}`).join(',');
  const expected = hmacSha256Base64(dataString, secretKey);
  return expected === providedSignature;
}

export function sanitizeEsewaTransactionUuid(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || `KX-${Date.now()}`;
}

export function verifyWebhookHmac(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256',
): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac(algorithm, secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return expected === signature;
  }
}

export function generateIdempotencyHash(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generatePaymentId(): string {
  return `pay_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}
