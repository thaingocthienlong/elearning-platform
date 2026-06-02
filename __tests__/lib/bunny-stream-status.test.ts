import {
  BUNNY_STREAM_STATUS_LABELS,
  isBunnyStreamPlayableStatus,
  mapBunnyStreamStatus,
} from '@/lib/bunny-stream/status';

describe('Bunny Stream status mapping', () => {
  test.each([
    [0, 'QUEUED'],
    [1, 'PROCESSING'],
    [2, 'ENCODING'],
    [3, 'READY'],
    [4, 'PLAYABLE'],
    [5, 'FAILED'],
    [6, 'UPLOADING'],
    [7, 'QUEUED'],
    [8, 'FAILED'],
  ])('maps Bunny status %s', (input, expected) => {
    expect(mapBunnyStreamStatus(input)).toBe(expected);
  });

  test('metadata-only events preserve previous status when present', () => {
    expect(mapBunnyStreamStatus(9, 'READY')).toBe('READY');
    expect(mapBunnyStreamStatus(10, 'PLAYABLE')).toBe('PLAYABLE');
  });

  test('unknown status maps to FAILED for safe admin visibility', () => {
    expect(mapBunnyStreamStatus(99)).toBe('FAILED');
  });

  test('exports human labels for operator UI', () => {
    expect(BUNNY_STREAM_STATUS_LABELS.READY).toBe('Finished');
    expect(BUNNY_STREAM_STATUS_LABELS.PLAYABLE).toBe(
      'First playable rendition ready'
    );
  });

  test('marks only ready/playable statuses as watchable', () => {
    expect(isBunnyStreamPlayableStatus('READY')).toBe(true);
    expect(isBunnyStreamPlayableStatus('PLAYABLE')).toBe(true);
    expect(isBunnyStreamPlayableStatus('ENCODING')).toBe(false);
    expect(isBunnyStreamPlayableStatus('FAILED')).toBe(false);
  });
});
