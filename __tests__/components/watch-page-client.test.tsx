import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WatchPageClient from '@/components/course/WatchPageClient';

jest.mock('next/dynamic', () => {
  return (
    importer: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
    options: { loading?: () => React.ReactElement | null }
  ) => {
    return function DynamicComponent(props: Record<string, unknown>) {
      const [LoadedComponent, setLoadedComponent] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null);

      React.useEffect(() => {
        let active = true;

        importer().then((mod: { default: React.ComponentType<Record<string, unknown>> }) => {
          if (active) {
            setLoadedComponent(() => mod.default);
          }
        });

        return () => {
          active = false;
        };
      }, []);

      if (!LoadedComponent) {
        return options?.loading ? options.loading() : null;
      }

      return React.createElement(LoadedComponent, props);
    };
  };
});

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks/useSessionValidator', () => ({
  useSessionValidator: jest.fn(),
}));

jest.mock('@/components/BrowserBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="browser-banner" />,
}));

jest.mock('@/components/course/VideoSidebarWrapper', () => ({
  __esModule: true,
  default: () => <div data-testid="video-sidebar" />,
}));

jest.mock('@/components/course/ChatLogViewer', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-log" />,
}));

jest.mock('@/components/course/IPRConsentOverlay', () => ({
  __esModule: true,
  default: ({ onAccept }: { onAccept: () => void }) => (
    <button type="button" onClick={onAccept}>
      Accept IPR
    </button>
  ),
}));

const mockDRMPlayer = jest.fn((_: Record<string, unknown>) => <div data-testid="drm-player" />);

jest.mock('@/components/video/DRMPlayerWrapper', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockDRMPlayer(props),
}));

const mockBunnyPlayer = jest.fn((_: Record<string, unknown>) => <div data-testid="bunny-player" />);

jest.mock('@/components/video/BunnyStreamPlayer', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockBunnyPlayer(props),
}));

jest.mock('@/lib/playback-routing', () => ({
  selectWatchPlaybackSources: jest.fn(() => ({
    dashUrl: 'https://media.example/video.mpd',
    hlsUrl: 'https://media.example/video.m3u8',
    drmToken: 'drm-token',
    isClearHlsFallback: false,
  })),
}));

describe('WatchPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const videoWatermarkSettings = {
    opacity: 0.8,
    sizeMultiplier: 1.4,
    mobileSizeMultiplier: 0.9,
    fullscreenSizeMultiplier: 1.8,
    iosFullscreenSizeMultiplier: 1.1,
  };

  test('passes server watermark settings into Bunny playback', async () => {
    render(
      <WatchPageClient
        videoId="video-abc"
        otp="otp"
        playbackInfo={{
          url: 'https://media.example/video.mpd',
          drmLicenseUrl: 'https://license.example',
        }}
        courseTitle="Course Title"
        sidebarVideos={[]}
        currentVideoId="video-abc"
        viewCount={1}
        viewLimit={5}
        watermarkText="Test User"
        drmToken="drm-token"
        dashUrl="https://media.example/video.mpd"
        hlsUrl="https://media.example/video.m3u8"
        hlsUrlClear={null}
        isFairPlayConfigured={false}
        provider="BUNNY_STREAM"
        bunnyPlayback={{
          libraryId: '123456',
          bunnyVideoId: 'video-abc',
        }}
        watermarkSettings={videoWatermarkSettings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept IPR' }));

    await waitFor(() => {
      expect(screen.getByTestId('bunny-player')).toBeInTheDocument();
    });

    expect(mockBunnyPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        libraryId: '123456',
        bunnyVideoId: 'video-abc',
        watermarkSettings: videoWatermarkSettings,
      })
    );
    expect(screen.getByText('Bunny Stream')).toBeInTheDocument();
    expect(screen.queryByText('DRM')).not.toBeInTheDocument();
    expect(screen.queryByTestId('drm-player')).not.toBeInTheDocument();
    expect(screen.getByTestId('video-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('chat-log')).toBeInTheDocument();
  });

  test('passes server watermark settings into DRM playback', async () => {
    render(
      <WatchPageClient
        videoId="video-abc"
        otp="otp"
        playbackInfo={{
          url: 'https://media.example/video.mpd',
          drmLicenseUrl: 'https://license.example',
        }}
        courseTitle="Course Title"
        sidebarVideos={[]}
        currentVideoId="video-abc"
        viewCount={1}
        viewLimit={5}
        watermarkText="Test User"
        drmToken="drm-token"
        dashUrl="https://media.example/video.mpd"
        hlsUrl="https://media.example/video.m3u8"
        hlsUrlClear={null}
        isFairPlayConfigured={false}
        provider="AXINOM"
        watermarkSettings={videoWatermarkSettings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept IPR' }));

    await waitFor(() => {
      expect(screen.getByTestId('drm-player')).toBeInTheDocument();
    });

    expect(mockDRMPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        watermarkSettings: videoWatermarkSettings,
      })
    );
    expect(screen.queryByTestId('bunny-player')).not.toBeInTheDocument();
  });
});
