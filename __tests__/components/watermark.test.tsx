import { render, screen, waitFor } from '@testing-library/react';
import Watermark from '@/components/video/Watermark';

class ResizeObserverMock {
  observe = jest.fn();
  disconnect = jest.fn();
}

describe('Watermark', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn() as unknown as typeof fetch;
    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 720,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('uses explicit settings instead of fetching cached settings', async () => {
    render(
      <div id="watermark-container">
        <iframe title="Bunny media" />
        <Watermark
          text="Test User"
          containerId="watermark-container"
          settings={{
            opacity: 0.8,
            sizeMultiplier: 1.5,
            mobileSizeMultiplier: 0.9,
            fullscreenSizeMultiplier: 1.8,
            iosFullscreenSizeMultiplier: 1.1,
          }}
        />
      </div>
    );

    const watermark = screen.getByText('Test User');

    await waitFor(() => {
      expect(watermark).toHaveStyle({ opacity: '0.8' });
      expect(watermark).toHaveStyle({ fontSize: '36px' });
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('updates when explicit settings change', async () => {
    const { rerender } = render(
      <div id="watermark-container">
        <iframe title="Bunny media" />
        <Watermark
          text="Test User"
          containerId="watermark-container"
          settings={{
            opacity: 0.4,
            sizeMultiplier: 1,
            mobileSizeMultiplier: 0.7,
            fullscreenSizeMultiplier: 1.3,
            iosFullscreenSizeMultiplier: 0.8,
          }}
        />
      </div>
    );

    const watermark = screen.getByText('Test User');

    await waitFor(() => {
      expect(watermark).toHaveStyle({ opacity: '0.4' });
    });

    rerender(
      <div id="watermark-container">
        <iframe title="Bunny media" />
        <Watermark
          text="Test User"
          containerId="watermark-container"
          settings={{
            opacity: 0.9,
            sizeMultiplier: 1.2,
            mobileSizeMultiplier: 0.7,
            fullscreenSizeMultiplier: 1.3,
            iosFullscreenSizeMultiplier: 0.8,
          }}
        />
      </div>
    );

    await waitFor(() => {
      expect(watermark).toHaveStyle({ opacity: '0.9' });
      expect(watermark).toHaveStyle({ fontSize: '29px' });
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
