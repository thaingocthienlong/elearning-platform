import { render, screen } from '@testing-library/react';
import TemporaryMuxPlayer from '@/components/video/TemporaryMuxPlayer';

jest.mock('@/components/video/Watermark', () => function WatermarkMock({
  text,
  containerId,
}: {
  text: string;
  containerId: string;
}) {
  return <div data-testid="watermark" data-container-id={containerId}>{text}</div>;
});

test('renders the approved Mux iframe without a frame border', () => {
  render(
    <TemporaryMuxPlayer
      playback={{
        playbackId: 'Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
        playerUrl:
          'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709',
        iframeTitle: 'video1448353709',
      }}
      watermarkText="Learner - 555-0100"
    />,
  );

  const frame = screen.getByTitle('video1448353709');
  expect(frame.parentElement).toHaveClass('aspect-video', 'w-full');
  expect(frame).toHaveClass('border-0');
  expect(frame).toHaveAttribute(
    'src',
    'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709',
  );
  expect(frame).toHaveAttribute(
    'allow',
    'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;',
  );
  expect(frame).toHaveAttribute('allowfullscreen');
  expect(screen.getByTestId('watermark')).toHaveTextContent('Learner - 555-0100');
  expect(screen.getByTestId('watermark')).toHaveAttribute(
    'data-container-id',
    'temporary-mux-player-Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
  );
});
