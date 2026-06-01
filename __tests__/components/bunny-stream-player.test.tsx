import { act, render, screen, waitFor } from '@testing-library/react';
import BunnyStreamPlayer from '@/components/video/BunnyStreamPlayer';
import { toast } from 'sonner';

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe('BunnyStreamPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('renders a signed Bunny iframe without exposing any API key material', () => {
    const signedEmbedUrl =
      'https://player.mediadelivery.net/embed/123456/video-abc?token=signed-token&expires=1717200000';

    const { container } = render(
      <BunnyStreamPlayer
        videoId="video-abc"
        libraryId="123456"
        bunnyVideoId="video-abc"
        signedEmbedUrl={signedEmbedUrl}
        viewCount={1}
        viewLimit={5}
        watermarkText="Test User"
      />
    );

    const iframe = screen.getByTitle('Secure Bunny Stream player');
    expect(iframe).toHaveAttribute('src', signedEmbedUrl);
    expect(iframe).toHaveAttribute('allow', expect.stringContaining('encrypted-media'));
    expect(iframe).toHaveAttribute('allowfullscreen');
    expect(container.innerHTML).not.toContain('BUNNY_STREAM_API_KEY');
    expect(container.innerHTML).not.toContain('api-key');
  });

  test('sends the initial heartbeat and then continues every 60 seconds as a returning view', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BunnyStreamPlayer
        videoId="video-abc"
        libraryId="123456"
        bunnyVideoId="video-abc"
        signedEmbedUrl="https://player.mediadelivery.net/embed/123456/video-abc?token=signed-token"
        viewCount={1}
        viewLimit={5}
        watermarkText="Test User"
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      videoId: 'video-abc',
      position: 0,
      isNewView: true,
      isFinished: false,
    });

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      videoId: 'video-abc',
      position: 0,
      isNewView: false,
      isFinished: false,
    });
  });

  test('blocks playback and toasts a safe access message on heartbeat 403', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ viewCount: 3, viewLimit: 2 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BunnyStreamPlayer
        videoId="video-abc"
        libraryId="123456"
        bunnyVideoId="video-abc"
        signedEmbedUrl="https://player.mediadelivery.net/embed/123456/video-abc?token=signed-token"
        viewCount={3}
        viewLimit={2}
        watermarkText="Test User"
      />
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Playback blocked. Your access window or view limit has been reached.'
      );
    });

    expect(screen.queryByTitle('Secure Bunny Stream player')).not.toBeInTheDocument();
    expect(screen.getByText('Playback blocked')).toBeInTheDocument();
  });
});
