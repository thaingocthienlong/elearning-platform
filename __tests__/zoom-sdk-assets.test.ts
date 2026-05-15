/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ZOOM_WEB_SDK_VERSION = '6.0.2';

describe('Zoom Web SDK static assets', () => {
  test('loads the current Zoom CDN runtime and styles', () => {
    const html = readFileSync(join(process.cwd(), 'public/zoom-meeting.html'), 'utf8');

    expect(html).toContain(`https://source.zoom.us/${ZOOM_WEB_SDK_VERSION}/css/bootstrap.css`);
    expect(html).toContain(`https://source.zoom.us/${ZOOM_WEB_SDK_VERSION}/css/react-select.css`);
    expect(html).toContain(`https://source.zoom.us/${ZOOM_WEB_SDK_VERSION}/zoom-meeting-${ZOOM_WEB_SDK_VERSION}.min.js`);
    expect(html).toContain(`ZoomMtg.setZoomJSLib('https://source.zoom.us/${ZOOM_WEB_SDK_VERSION}/lib', '/av')`);
    expect(html).not.toContain('source.zoom.us/5.0.4');
  });
});
