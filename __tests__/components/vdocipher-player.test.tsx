import { render, screen } from '@testing-library/react';
import VdoCipherPlayer from '@/components/video/VdoCipherPlayer';

jest.mock('@/components/video/Watermark', () => ({
  __esModule: true,
  default: ({ text, containerId }: { text: string; containerId: string }) => (
    <div data-testid="watermark" data-container-id={containerId}>
      {text}
    </div>
  ),
}));

describe('VdoCipherPlayer', () => {
  it('renders iframe with encoded otp and playbackInfo', () => {
    render(
      <VdoCipherPlayer
        otp="otp value"
        playbackInfo="playback/value"
        title="Lesson 01"
        videoId="video-123"
        watermarkText="Learner"
      />
    );

    const iframe = screen.getByTitle('Lesson 01') as HTMLIFrameElement;

    expect(iframe.src).toContain('https://player.vdocipher.com/v2/');
    expect(iframe.src).toContain('otp=otp+value');
    expect(iframe.src).toContain('playbackInfo=playback%2Fvalue');
  });

  it('renders the app watermark overlay and blocks iframe fullscreen', () => {
    render(
      <VdoCipherPlayer
        otp="otp"
        playbackInfo="playback"
        title="Lesson 01"
        videoId="video-123"
        watermarkText="Learner <learner@example.test>"
      />
    );

    const iframe = screen.getByTitle('Lesson 01') as HTMLIFrameElement;
    const watermark = screen.getByTestId('watermark');

    expect(watermark).toHaveTextContent('Learner <learner@example.test>');
    expect(watermark).toHaveAttribute('data-container-id', 'vdocipher-player-video-123');
    expect(iframe).toHaveAttribute('allow', 'encrypted-media');
    expect(iframe).not.toHaveAttribute('allowfullscreen');
  });
});
