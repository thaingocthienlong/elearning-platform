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
}: {
  fairplayCertUrl?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useShakaPlayer({
    videoRef,
    containerRef,
    manifestUrl: 'https://media.example/video/clear.m3u8',
    licenseServerUrl: 'https://license.example/fairplay',
    drmToken: '',
    drmType: 'fairplay',
    fairplayCertUrl,
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
});
