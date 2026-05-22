import { readFileSync } from 'fs';
import path from 'path';

describe('Providers session monitor', () => {
  test('uses a shorter fallback polling interval on meeting pages', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/components/Providers.tsx'),
      'utf8'
    );

    expect(source).toContain("import { usePathname } from 'next/navigation'");
    expect(source).toContain("pathname?.startsWith('/meeting')");
    expect(source).toContain("useSessionSSE(status === 'authenticated', isMeetingPath ? 15000 : 300000)");
  });
});
