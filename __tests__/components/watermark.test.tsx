import { render, screen, waitFor } from '@testing-library/react';
import Watermark from '@/components/video/Watermark';

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

class MutationObserverStub {
  observe() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, writable: true });
Object.defineProperty(globalThis, 'MutationObserver', { value: MutationObserverStub, writable: true });
Object.defineProperty(globalThis, 'fetch', {
  value: jest.fn().mockResolvedValue({ ok: false }),
  writable: true,
});

test('sizes the watermark for an iframe-backed player container', async () => {
  const container = document.createElement('div');
  container.id = 'iframe-player';
  Object.defineProperty(container, 'clientWidth', { configurable: true, value: 640 });
  Object.defineProperty(container, 'clientHeight', { configurable: true, value: 360 });
  container.innerHTML = '<iframe title="player"></iframe>';
  document.body.appendChild(container);

  render(<Watermark text="Learner - 555-0100" containerId="iframe-player" />);

  const watermark = screen.getByText('Learner - 555-0100');
  await waitFor(() => expect(watermark).toHaveStyle({ fontSize: '20px' }));
});
