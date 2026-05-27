import { buildVdoCipherAnnotate } from '@/lib/vdocipher-watermark';

describe('buildVdoCipherAnnotate', () => {
  it('returns a JSON string accepted by VdoCipher annotate field', () => {
    const annotate = buildVdoCipherAnnotate(' Nguyen Van A - 0900000000 ');
    const parsed = JSON.parse(annotate);

    expect(parsed).toEqual([
      {
        type: 'rtext',
        text: 'Nguyen Van A - 0900000000',
        alpha: '0.60',
        color: '0xFFFFFF',
        size: '15',
        interval: '5000',
        skip: '5000',
      },
    ]);
  });

  it('caps long watermark text to 160 characters after trimming', () => {
    const annotate = buildVdoCipherAnnotate(` ${'x'.repeat(500)} `);
    const parsed = JSON.parse(annotate);

    expect(parsed[0].text).toHaveLength(160);
  });
});
