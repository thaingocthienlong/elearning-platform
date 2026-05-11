import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Phase 7 UI redesign contract', () => {
  test('UI-SPEC defines the accepted Phase 7 design direction', () => {
    const spec = readText('.planning/phases/07-academic-frontend-redesign/UI-SPEC.md');

    expect(spec).toContain('DESIGN.md');
    expect(spec).toContain('Apple-like product-gallery system');
    expect(spec).toContain('preserve existing course, watch, admin, meeting, support, auth, and system workflows');
    expect(spec).toContain('blocked: missing credentials/service access');
  });

  test('learner/public route files use shared design styling hooks', () => {
    for (const relativePath of [
      'src/app/page.tsx',
      'src/components/course/CoursesListClient.tsx',
      'src/components/course/CourseDetailClient.tsx',
      'src/app/meeting/page.tsx',
      'src/app/auth/signin/page.tsx',
    ]) {
      expect(readText(relativePath)).toMatch(/design-(page|tile|container|heading|lead|display)/);
    }
  });

  test('watch route keeps operational styling allowed by contract', () => {
    const watch = readText('src/components/course/WatchPageClient.tsx');

    expect(watch).toContain('DRMPlayerWrapper');
    expect(watch).toContain('VideoSidebarWrapper');
    expect(watch).toContain("t('secureLecturePlayback')");
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
