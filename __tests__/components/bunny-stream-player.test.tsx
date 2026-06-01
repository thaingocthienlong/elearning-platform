import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import BunnyStreamPlayer from '@/components/video/BunnyStreamPlayer';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

describe('BunnyStreamPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('renders start control and does not send heartbeat before click', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BunnyStreamPlayer
        videoId="video-abc"
        libraryId="123456"
        bunnyVideoId="video-abc"
        viewCount={1}
        viewLimit={5}
        watermarkText="Test User"
      />
    );

    expect(screen.getByRole('button', { name: /start secure player/i })).toBeInTheDocument();
    expect(screen.queryByTitle('Secure Bunny Stream player')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('click fetches playback url, renders iframe, and starts heartbeat after load', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (input === '/api/video/bunny-stream/playback') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            signedEmbedUrl:
              'https://player.mediadelivery.net/embed/123456/video-abc?token=signed-token&expires=1717200300&autoplay=false&preload=true&responsive=true',
            expires: 1_717_200_300,
            libraryId: '123456',
            bunnyVideoId: 'video-abc',
          }),
        } as Response;
      }

      if (input === '/api/watch/heartbeat') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BunnyStreamPlayer
        videoId="video-abc"
        libraryId="123456"
        bunnyVideoId="video-abc"
        viewCount={1}
        viewLimit={5}
        watermarkText="Test User"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /start secure player/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/video/bunny-stream/playback',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTitle('Secure Bunny Stream player')).toHaveAttribute(
        'src',
        'https://player.mediadelivery.net/embed/123456/video-abc?token=signed-token&expires=1717200300&autoplay=false&preload=true&responsive=true'
      );
    });

    await waitFor(() => {
      const heartbeatCalls = fetchMock.mock.calls.filter(([input]) => input === '/api/watch/heartbeat');
      expect(heartbeatCalls).toHaveLength(1);
    });

    const firstHeartbeat = fetchMock.mock.calls.find(([input]) => input === '/api/watch/heartbeat');
    expect(JSON.parse(firstHeartbeat?.[1]?.body as string)).toEqual({
      videoId: 'video-abc',
      position: 0,
      isNewView: true,
      isFinished: false,
    });

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    await waitFor(() => {
      const heartbeatCalls = fetchMock.mock.calls.filter(([input]) => input === '/api/watch/heartbeat');
      expect(heartbeatCalls).toHaveLength(2);
    });

    const secondHeartbeat = fetchMock.mock.calls.filter(([input]) => input === '/api/watch/heartbeat')[1];
    expect(JSON.parse(secondHeartbeat?.[1]?.body as string)).toEqual({
      videoId: 'video-abc',
      position: 0,
      isNewView: false,
      isFinished: false,
    });
  });

  test('toasts a safe error and leaves player closed when playback fetch fails', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (input === '/api/video/bunny-stream/playback') {
        return {
          ok: false,
          status: 403,
          json: async () => ({ error: 'Access denied' }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BunnyStreamPlayer
        videoId="video-abc"
        libraryId="123456"
        bunnyVideoId="video-abc"
        viewCount={1}
        viewLimit={5}
        watermarkText="Test User"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /start secure player/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Unable to start secure playback.');
    });

    expect(screen.queryByTitle('Secure Bunny Stream player')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => input === '/api/watch/heartbeat')).toBe(false);
  });
});
