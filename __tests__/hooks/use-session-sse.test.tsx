import {
  SESSION_REVOKED_EVENT,
  notifySessionRevoked,
} from '@/hooks/useSessionSSE';

describe('session SSE client events', () => {
  test('dispatches a browser event with the revocation reason', () => {
    const listener = jest.fn();
    window.addEventListener(SESSION_REVOKED_EVENT, listener);

    notifySessionRevoked('Signed in on another device');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      reason: 'Signed in on another device',
    });

    window.removeEventListener(SESSION_REVOKED_EVENT, listener);
  });
});
