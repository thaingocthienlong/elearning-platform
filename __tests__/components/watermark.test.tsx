import { render, screen, waitFor } from '@testing-library/react';
import Watermark from '@/components/video/Watermark';

class ResizeObserverMock {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }

  disconnect() {}
}

describe('Watermark', () => {
  const originalFetch = global.fetch;
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 640,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 360,
    });
    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        opacity: 0.5,
        sizeMultiplier: 2,
        mobileSizeMultiplier: 0.7,
        fullscreenSizeMultiplier: 1.3,
        iosFullscreenSizeMultiplier: 0.8,
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.ResizeObserver = originalResizeObserver;
    jest.restoreAllMocks();
  });

  it('applies size multiplier when the container has no direct video element', async () => {
    render(
      <div id="iframe-watermark-container">
        <Watermark text="Learner" containerId="iframe-watermark-container" />
      </div>
    );

    await waitFor(() => {
      expect(screen.getByText('Learner')).toHaveStyle({ fontSize: '40px' });
    });
  });
});
