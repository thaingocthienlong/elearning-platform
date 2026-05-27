import { render, screen } from '@testing-library/react';
import VdoCipherPlayer from '@/components/video/VdoCipherPlayer';

describe('VdoCipherPlayer', () => {
  it('renders iframe with encoded otp and playbackInfo', () => {
    render(<VdoCipherPlayer otp="otp value" playbackInfo="playback/value" title="Lesson 01" />);

    const iframe = screen.getByTitle('Lesson 01') as HTMLIFrameElement;

    expect(iframe.src).toContain('https://player.vdocipher.com/v2/');
    expect(iframe.src).toContain('otp=otp+value');
    expect(iframe.src).toContain('playbackInfo=playback%2Fvalue');
  });
});
