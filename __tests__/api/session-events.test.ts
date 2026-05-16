/**
 * @jest-environment node
 */
import { notifyIfSessionRevoked } from '@/app/api/session/events/route';

describe('session events route helpers', () => {
  test('sends revoked event and closes stream when Redis marks session revoked', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue('true'),
    };
    const controller = {
      close: jest.fn(),
      enqueue: jest.fn(),
    };

    const revoked = await notifyIfSessionRevoked(
      redis,
      'session_revoked:old-token',
      controller,
      'old-token-prefix-123',
      'Signed in on another device'
    );

    expect(revoked).toBe(true);
    expect(redis.get).toHaveBeenCalledWith('session_revoked:old-token');
    expect(controller.enqueue).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(new TextDecoder().decode(controller.enqueue.mock.calls[0][0])).toContain('event: revoked');
    expect(new TextDecoder().decode(controller.enqueue.mock.calls[0][0])).toContain('Signed in on another device');
    expect(controller.close).toHaveBeenCalled();
  });

  test('keeps stream open when Redis has no revocation marker', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue(null),
    };
    const controller = {
      close: jest.fn(),
      enqueue: jest.fn(),
    };

    const revoked = await notifyIfSessionRevoked(
      redis,
      'session_revoked:current-token',
      controller,
      'current-token-prefix-123'
    );

    expect(revoked).toBe(false);
    expect(controller.enqueue).not.toHaveBeenCalled();
    expect(controller.close).not.toHaveBeenCalled();
  });
});
