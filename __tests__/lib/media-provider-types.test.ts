import {
  isReadyProviderStatus,
  normalizeProviderStatus,
  type MediaProviderName,
} from '@/lib/media-provider/types';

describe('media provider types', () => {
  test('normalizes DoveRunner status values used by T&P', () => {
    expect(normalizeProviderStatus('queued')).toBe('QUEUED');
    expect(normalizeProviderStatus('progress')).toBe('PROCESSING');
    expect(normalizeProviderStatus('success')).toBe('READY');
    expect(normalizeProviderStatus('fail')).toBe('FAILED');
    expect(normalizeProviderStatus('unknown-state')).toBe('UNKNOWN');
  });

  test('detects ready provider status', () => {
    expect(isReadyProviderStatus('READY')).toBe(true);
    expect(isReadyProviderStatus('PROCESSING')).toBe(false);
  });

  test('keeps provider name narrow', () => {
    const provider: MediaProviderName = 'doverunner';
    expect(provider).toBe('doverunner');
  });
});
