import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('academic UI redesign contract', () => {
  test('UI-SPEC defines the accepted Phase 7 design direction', () => {
    const spec = readText('.planning/phases/07-academic-frontend-redesign/UI-SPEC.md');

    expect(spec).toContain('formal, credible');
    expect(spec).toContain('Institutional green');
    expect(spec).toContain('preserving the platform');
    expect(spec).toContain('If Playwright is unavailable');
  });

  test('primary route files use shared academic styling hooks', () => {
    for (const relativePath of [
      'src/app/page.tsx',
      'src/components/course/CoursesListClient.tsx',
      'src/components/course/CourseDetailClient.tsx',
      'src/components/course/WatchPageClient.tsx',
      'src/app/meeting/page.tsx',
      'src/app/auth/signin/page.tsx',
    ]) {
      expect(readText(relativePath)).toMatch(/academic-(page|panel|band|container|kicker)/);
    }
  });

  test('screenshot checklist covers primary desktop and mobile surfaces', () => {
    const checklist = readText('docs/ui-screenshot-checklist.md');

    for (const id of [
      'UI-HOME-D',
      'UI-HOME-M',
      'UI-COURSES-D',
      'UI-COURSE-M',
      'UI-WATCH-D',
      'UI-WATCH-M',
      'UI-MEETING-D',
      'UI-AUTH-M',
      'UI-SUPPORT-D',
    ]) {
      expect(checklist).toContain(id);
    }

    expect(checklist).toContain('blocked: missing browser automation tooling');
  });
});
