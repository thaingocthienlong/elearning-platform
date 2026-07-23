import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import SecurityEventsPage from '@/app/admin/security-events/page';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/ui/dialog', () => {
  const Wrapper = ({ children }: PropsWithChildren) => <div>{children}</div>;

  return {
    Dialog: Wrapper,
    DialogContent: Wrapper,
    DialogDescription: Wrapper,
    DialogFooter: Wrapper,
    DialogHeader: Wrapper,
    DialogTitle: Wrapper,
    DialogTrigger: Wrapper,
  };
});

describe('SecurityEventsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends explicit confirmation when flushing security events', async () => {
    const fetchMock = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return {
          ok: true,
          json: async () => ({ count: 1 }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          events: [
            {
              id: 'event-1',
              userId: 'user-1',
              videoId: null,
              eventType: 'SCREEN_CAPTURE_DETECTED',
              metadata: null,
              ipAddress: null,
              userAgent: null,
              createdAt: '2026-07-13T00:00:00.000Z',
              User: { name: 'Learner One', email: 'learner@example.test' },
              Video: null,
            },
          ],
          totalPages: 1,
        }),
      } as Response;
    });
    global.fetch = fetchMock as typeof fetch;

    render(<SecurityEventsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Flush All' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, Delete All' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/security-events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'FLUSH_SECURITY_EVENTS' }),
      });
    });
  });
});
