const MAX_WATERMARK_LENGTH = 160;

export function buildVdoCipherAnnotate(watermarkText: string) {
  const safeText = watermarkText.trim().slice(0, MAX_WATERMARK_LENGTH);

  return JSON.stringify([
    {
      type: 'text',
      text: safeText,
      alpha: '0.60',
      color: '0xFFFFFF',
      size: '15',
      x: '10',
      y: '10',
    },
  ]);
}
