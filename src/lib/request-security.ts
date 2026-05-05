export const SUPPORT_LIMITS = {
  descriptionBytes: 5_000,
  diagnosticsBytes: 50_000,
  consoleLogEntries: 100,
  pageUrlBytes: 2_048,
};

const sensitiveKeyPattern =
  /(authorization|cookie|password|passwd|token|secret|api[-_]?key|access[-_]?key|refresh[-_]?token|email)/i;

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const bearerPattern = /bearer\s+[a-z0-9._~+/=-]+/gi;

export function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

export function requireBoundedString(
  value: unknown,
  fieldName: string,
  maxBytes: number
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (byteLength(value) > maxBytes) {
    throw new Error(`${fieldName} is too large`);
  }

  return value.trim();
}

export function optionalBoundedString(
  value: unknown,
  fieldName: string,
  maxBytes: number
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  if (byteLength(value) > maxBytes) {
    throw new Error(`${fieldName} is too large`);
  }

  return value;
}

function redactString(value: string): string {
  return value
    .replace(bearerPattern, 'Bearer [REDACTED]')
    .replace(emailPattern, '[REDACTED_EMAIL]');
}

export function redactSensitiveData(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item));
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (sensitiveKeyPattern.test(key)) {
      redacted[key] = '[REDACTED]';
      continue;
    }

    redacted[key] = redactSensitiveData(nestedValue);
  }

  return redacted;
}

export function boundedDiagnostics(
  value: unknown,
  fieldName: string,
  maxBytes = SUPPORT_LIMITS.diagnosticsBytes
): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  const boundedValue =
    Array.isArray(value) && value.length > SUPPORT_LIMITS.consoleLogEntries
      ? value.slice(-SUPPORT_LIMITS.consoleLogEntries)
      : value;

  const serialized = JSON.stringify(boundedValue);
  if (byteLength(serialized) > maxBytes) {
    throw new Error(`${fieldName} is too large`);
  }

  return redactSensitiveData(boundedValue);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}
