import { render, screen } from '@testing-library/react';
import TemporaryMuxPlayer from '@/components/video/TemporaryMuxPlayer';

test('renders the approved Mux iframe without a frame border', () => {
  render(
    <TemporaryMuxPlayer
      playback={{
        playbackId: 'Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
        playerUrl:
          'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709',
        iframeTitle: 'video1448353709',
      }}
    />,
  );

  const frame = screen.getByTitle('video1448353709');
  expect(frame).toHaveAttribute(
    'src',
    'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709',
  );
  expect(frame).toHaveAttribute(
    'allow',
    'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;',
  );
  expect(frame).toHaveAttribute('allowfullscreen');
});
