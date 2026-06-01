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

jest.mock('@/components/video/DRMPlayerWrapper', () => ({
  __esModule: true,
  default: () => <div data-testid="drm-player" />,
}));

jest.mock('@/components/video/BunnyStreamPlayer', () => ({
  __esModule: true,
  default: () => <div data-testid="bunny-player" />,
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
  test('renders Bunny playback instead of DRM playback when the provider is Bunny Stream', async () => {
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
          embedUrl:
            'https://player.mediadelivery.net/embed/123456/video-abc?token=signed-token',
          libraryId: '123456',
          videoId: 'video-abc',
          token: 'signed-token',
          expires: 1717200000,
          autoplay: false,
          preload: true,
          responsive: true,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept IPR' }));

    await waitFor(() => {
      expect(screen.getByTestId('bunny-player')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('drm-player')).not.toBeInTheDocument();
    expect(screen.getByTestId('video-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('chat-log')).toBeInTheDocument();
  });
});
