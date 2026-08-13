import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TosConsentDialog from '@/components/tos/TosConsentDialog';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/tos-access', () => ({ TOS_VERSION: '2026-08-13' }));

let frames: FrameRequestCallback[] = [];

function setViewport(
  viewport: HTMLElement,
  {
    scrollHeight,
    clientHeight,
    scrollTop = 0,
  }: {
    scrollHeight: number;
    clientHeight: number;
    scrollTop?: number;
  },
) {
  Object.defineProperties(viewport, {
    scrollHeight: { configurable: true, value: scrollHeight },
    clientHeight: { configurable: true, value: clientHeight },
    scrollTop: { configurable: true, writable: true, value: scrollTop },
  });
}

function finishMeasurement(viewport: HTMLElement, dimensions: Parameters<typeof setViewport>[1]) {
  setViewport(viewport, dimensions);
  act(() => {
    const pending = frames;
    frames = [];
    pending.forEach((frame) => frame(0));
  });
}

describe('TosConsentDialog', () => {
  beforeEach(() => {
    frames = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
      frames.push(frame);
      return frames.length;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('keeps confirmation disabled until overflowing content reaches the end', () => {
    render(<TosConsentDialog />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 600, clientHeight: 200 });

    const checkbox = screen.getByRole('checkbox', { name: 'tosConfirmation' });
    expect(checkbox).toBeDisabled();
    expect(screen.getByRole('button', { name: 'tosAgree' })).toBeDisabled();

    viewport.scrollTop = 399;
    fireEvent.scroll(viewport);
    expect(checkbox).toBeEnabled();

    fireEvent.click(checkbox);
    expect(screen.getByRole('button', { name: 'tosAgree' })).toBeEnabled();
  });

  test('scrolls the viewport to the end when the focused region receives End', () => {
    render(<TosConsentDialog />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 600, clientHeight: 200 });

    fireEvent.keyDown(region, { key: 'End' });

    expect(viewport.scrollTop).toBe(400);
    expect(screen.getByRole('checkbox', { name: 'tosConfirmation' })).toBeEnabled();
  });

  test('unlocks confirmation when all content fits without scrolling', () => {
    render(<TosConsentDialog />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 200, clientHeight: 200 });
    expect(screen.getByRole('checkbox', { name: 'tosConfirmation' })).toBeEnabled();
  });

  test('cannot dismiss into protected content and supports explicit decline', () => {
    const onDecline = jest.fn();
    render(<TosConsentDialog onDecline={onDecline} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'tosDecline' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: 'tosScrollRegionLabel' })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  test('prevents duplicate submission and calls success action once', async () => {
    let resolveFetch!: (value: Response) => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const onAccepted = jest.fn();
    render(<TosConsentDialog onAccepted={onAccepted} />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 200, clientHeight: 200 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'tosConfirmation' }));

    const agree = screen.getByRole('button', { name: 'tosAgree' });
    fireEvent.click(agree);
    fireEvent.click(agree);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/tos/accept', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: true, version: '2026-08-13' }),
    });
    expect(screen.getByRole('button', { name: 'tosSubmitting' })).toBeDisabled();

    resolveFetch({ ok: true } as Response);
    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1));
  });

  test('shows an error and permits retry without granting access', async () => {
    const onAccepted = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);
    render(<TosConsentDialog onAccepted={onAccepted} />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 200, clientHeight: 200 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'tosConfirmation' }));
    fireEvent.click(screen.getByRole('button', { name: 'tosAgree' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('tosSubmitError');
    expect(onAccepted).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'tosAgree' }));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1));
  });
});
