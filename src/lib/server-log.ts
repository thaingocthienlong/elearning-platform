import { redactSensitiveData } from '@/lib/request-security';

type LogMetadata = Record<string, unknown> | unknown;

function sanitize(metadata: LogMetadata): unknown {
  return redactSensitiveData(metadata);
}

function write(
  level: 'info' | 'warn' | 'error',
  event: string,
  metadata?: LogMetadata
): void {
  const payload = metadata === undefined ? undefined : sanitize(metadata);

  if (payload === undefined) {
    console[level](event);
    return;
  }

  console[level](event, payload);
}

export const serverLog = {
  info(event: string, metadata?: LogMetadata): void {
    write('info', event, metadata);
  },

  warn(event: string, metadata?: LogMetadata): void {
    write('warn', event, metadata);
  },

  error(event: string, metadata?: LogMetadata): void {
    write('error', event, metadata);
  },
};
