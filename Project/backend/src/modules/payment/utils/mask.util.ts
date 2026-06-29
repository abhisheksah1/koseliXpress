export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 6) return '******';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function maskPayload(payload: unknown): unknown {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload.map(maskPayload);

  const sensitive = new Set([
    'secret',
    'secretkey',
    'secret_key',
    'password',
    'authorization',
    'signature',
    'apikey',
    'api_key',
    'token',
  ]);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (sensitive.has(key.toLowerCase())) {
      out[key] = typeof value === 'string' ? maskSecret(value) : '******';
    } else if (typeof value === 'object') {
      out[key] = maskPayload(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
