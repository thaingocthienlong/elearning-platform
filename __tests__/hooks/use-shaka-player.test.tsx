import { render, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { useShakaPlayer } from '@/hooks/player/useShakaPlayer';

const mockConfigure = jest.fn();
const mockLoad = jest.fn().mockResolvedValue(undefined);
const mockAttach = jest.fn().mockResolvedValue(undefined);
const mockDestroy = jest.fn().mockResolvedValue(undefined);
const mockRegisterRequestFilter = jest.fn();
const mockOverlayConfigure = jest.fn();

const mockPlayerCtor = jest.fn(() => ({
  attach: mockAttach,
  configure: mockConfigure,
  destroy: mockDestroy,
  getNetworkingEngine: () => ({
    registerRequestFilter: mockRegisterRequestFilter,
  }),
  load: mockLoad,
}));

const mockOverlayCtor = jest.fn(() => ({
  configure: mockOverlayConfigure,
}));

jest.mock('shaka-player/dist/shaka-player.ui.js', () => ({
  __esModule: true,
  default: {
    Player: mockPlayerCtor,
    net: {
      NetworkingEngine: {
        RequestType: {
          LICENSE: 1,
        },
      },
    },
    ui: {
      Overlay: mockOverlayCtor,
    },
  },
}));

function ShakaHarness({
  fairplayCertUrl,
  drmToken = '',
  drmType = 'fairplay',
  licenseServerUrl = 'https://license.example/fairplay',
  manifestUrl = 'https://media.example/video/clear.m3u8',
  videoId = 'video-1',
}: {
  fairplayCertUrl?: string;
  drmToken?: string;
  drmType?: 'widevine' | 'playready' | 'fairplay';
  licenseServerUrl?: string;
  manifestUrl?: string;
  videoId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useShakaPlayer({
    videoRef,
    containerRef,
    manifestUrl,
    licenseServerUrl,
    drmToken,
    drmType,
    fairplayCertUrl,
    videoId,
  });

  return (
    <div ref={containerRef}>
      <video ref={videoRef} />
    </div>
  );
}

describe('useShakaPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses native HLS for clear Safari fallback playback', async () => {
    render(<ShakaHarness />);

    await waitFor(() => {
      expect(mockLoad).toHaveBeenCalledWith(
        'https://media.example/video/clear.m3u8'
      );
    });

    expect(mockConfigure).toHaveBeenCalledWith({
      streaming: {
        preferNativeHls: true,
      },
    });
    expect(mockConfigure).not.toHaveBeenCalledWith(
      expect.objectContaining({
        drm: expect.anything(),
      })
    );
    expect(mockRegisterRequestFilter).not.toHaveBeenCalled();
  });

  test('fetches a fresh DRM token for license requests', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'fresh-token' }),
    });
    global.fetch = fetchMock;

    render(
      <ShakaHarness
        drmToken="initial-token"
        drmType="widevine"
        licenseServerUrl="https://license.example/widevine"
        manifestUrl="https://media.example/video/protected.mpd"
      />
    );

    await waitFor(() => {
      expect(mockRegisterRequestFilter).toHaveBeenCalled();
    });

    const requestFilter = mockRegisterRequestFilter.mock.calls[0][0];
    const request = { headers: {} as Record<string, string> };

    await requestFilter(1, request);

    expect(fetchMock).toHaveBeenCalledWith('/api/drm/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: 'video-1' }),
    });
    expect(request.headers['X-AxDRM-Message']).toBe('fresh-token');
  });
});
