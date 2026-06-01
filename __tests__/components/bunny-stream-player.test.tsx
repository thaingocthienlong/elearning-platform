import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import BunnyStreamPlayer from '@/components/video/BunnyStreamPlayer';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

type PlayerListener = (...args: unknown[]) => void;

class MockPlayerJsPlayer {
  private readonly listeners = new Map<string, Set<PlayerListener>>();

  constructor(readonly iframe: HTMLIFrameElement) {
    void iframe;
  }

  on(event: string, handler: PlayerListener) {
    const handlers = this.listeners.get(event) ?? new Set<PlayerListener>();
    handlers.add(handler);
    this.listeners.set(event, handlers);
  }

  off(event: string, handler: PlayerListener) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]) {
    for (const handler of this.listeners.get(event) ?? []) {
      handler(...args);
    }
  }

  destroy = jest.fn();
  dispose = jest.fn();
}

let mockPlayerInstance: MockPlayerJsPlayer | null = null;

function createPlayerConstructor(playerClass: new (iframe: HTMLIFrameElement) => MockPlayerJsPlayer) {
  return function (iframe: HTMLIFrameElement) {
    const instance = new playerClass(iframe);
    mockPlayerInstance = instance;
    return instance;
  } as unknown as new (iframe: HTMLIFrameElement) => MockPlayerJsPlayer;
}

function installPlayerJsMock(playerClass: new (iframe: HTMLIFrameElement) => MockPlayerJsPlayer) {
  (window as Window & { playerjs?: { Player: new (iframe: HTMLIFrameElement) => MockPlayerJsPlayer } }).playerjs = {
    Player: createPlayerConstructor(playerClass),
  };
}

function createPlaybackFetchMock() {
  return jest.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
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
}

describe('BunnyStreamPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockPlayerInstance = null;
    installPlayerJsMock(MockPlayerJsPlayer);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete (window as Window & { playerjs?: unknown }).playerjs;
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

  test('click fetches playback url, renders iframe, and waits for play before sending heartbeat', async () => {
    const fetchMock = createPlaybackFetchMock();
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

    expect(fetchMock.mock.calls.filter(([input]) => input === '/api/watch/heartbeat')).toHaveLength(0);

    await act(async () => {
      mockPlayerInstance?.emit('play');
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
      mockPlayerInstance?.emit('timeupdate', { seconds: 42.8, duration: 120 });
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
      position: 42,
      isNewView: false,
      isFinished: false,
    });
  });

  test('ended sends a final heartbeat with the latest position', async () => {
    const fetchMock = createPlaybackFetchMock();
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
      expect(screen.getByTitle('Secure Bunny Stream player')).toBeInTheDocument();
    });

    await act(async () => {
      mockPlayerInstance?.emit('play');
    });

    await waitFor(() => {
      const heartbeatCalls = fetchMock.mock.calls.filter(([input]) => input === '/api/watch/heartbeat');
      expect(heartbeatCalls).toHaveLength(1);
    });

    await act(async () => {
      mockPlayerInstance?.emit('timeupdate', { seconds: 93.4, duration: 120 });
      mockPlayerInstance?.emit('ended');
    });

    await waitFor(() => {
      const heartbeatCalls = fetchMock.mock.calls.filter(([input]) => input === '/api/watch/heartbeat');
      expect(heartbeatCalls).toHaveLength(2);
    });

    const finalHeartbeat = fetchMock.mock.calls.filter(([input]) => input === '/api/watch/heartbeat')[1];
    expect(JSON.parse(finalHeartbeat?.[1]?.body as string)).toEqual({
      videoId: 'video-abc',
      position: 93,
      isNewView: false,
      isFinished: true,
    });
  });

  test('shows a safe setup error and does not start heartbeat when playerjs fails', async () => {
    const fetchMock = createPlaybackFetchMock();
    global.fetch = fetchMock as unknown as typeof fetch;
    const ThrowingPlayer = class {
      constructor() {
        throw new Error('player bootstrap failed');
      }
    } as unknown as new (iframe: HTMLIFrameElement) => MockPlayerJsPlayer;

    installPlayerJsMock(ThrowingPlayer);

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
      expect(screen.getByText('Playback unavailable')).toBeInTheDocument();
    });

    expect(mockToastError).toHaveBeenCalledWith('Unable to initialize secure playback.');
    expect(fetchMock.mock.calls.some(([input]) => input === '/api/watch/heartbeat')).toBe(false);
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
