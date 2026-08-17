import { render, screen } from '@testing-library/react';
import WatchPageClient from '@/components/course/WatchPageClient';
import type { TemporaryMuxPlayback } from '@/lib/temporary-mux-playback';

jest.mock('next/dynamic', () => () => function TencentPlayer(props: { videoId: string }) {
  return <div data-testid="tencent-player" data-video-id={props.videoId} />;
});

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useSessionValidator', () => ({
  useSessionValidator: jest.fn(),
}));

jest.mock('@/components/BrowserBanner', () => function BrowserBannerMock() {
  return <div />;
});
jest.mock('@/components/course/ChatLogViewer', () => function ChatLogViewerMock() {
  return <div />;
});
jest.mock('@/components/course/VideoSidebarWrapper', () => function VideoSidebarWrapperMock() {
  return <aside />;
});

const baseProps = {
  videoId: 'video-1',
  otp: 'user-1',
  playbackInfo: { url: 'https://example.test/manifest.mpd', drmLicenseUrl: '' },
  courseTitle: 'Course Content',
  sidebarVideos: [],
  currentVideoId: 'video-1',
  viewCount: 0,
  viewLimit: null,
  watermarkText: 'Learner',
  drmToken: 'tencent-token',
  dashUrl: 'https://example.test/manifest.mpd',
  hlsUrl: null,
  hlsUrlClear: null,
  isFairPlayConfigured: false,
};

const muxPlayback: TemporaryMuxPlayback = {
  playbackId: 'Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
  playerUrl: 'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
  iframeTitle: 'video1448353709',
};

test('renders the Mux iframe and removes the DRM label for a temporary Mux playback', () => {
  render(<WatchPageClient {...baseProps} temporaryMuxPlayback={muxPlayback} />);

  expect(screen.getByTitle('video1448353709')).toBeInTheDocument();
  expect(screen.getByText('Temporary Mux')).toBeInTheDocument();
  expect(screen.queryByText('DRM')).not.toBeInTheDocument();
  expect(screen.queryByText('watermarked')).not.toBeInTheDocument();
  expect(screen.queryByTestId('tencent-player')).not.toBeInTheDocument();
});

test('keeps the Tencent player and DRM label for a non-Mux playback', () => {
  render(<WatchPageClient {...baseProps} temporaryMuxPlayback={null} />);

  expect(screen.getByTestId('tencent-player')).toHaveAttribute('data-video-id', 'video-1');
  expect(screen.getByText('DRM')).toBeInTheDocument();
  expect(screen.queryByText('Temporary Mux')).not.toBeInTheDocument();
});
