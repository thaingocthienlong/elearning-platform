export const WATERMARK_SCOPE = 'global';

export type VideoWatermarkSettings = {
  opacity: number;
  sizeMultiplier: number;
  mobileSizeMultiplier: number;
  fullscreenSizeMultiplier: number;
  iosFullscreenSizeMultiplier: number;
};

export const defaultVideoWatermarkSettings: VideoWatermarkSettings = {
  opacity: 0.5,
  sizeMultiplier: 1.0,
  mobileSizeMultiplier: 0.7,
  fullscreenSizeMultiplier: 1.3,
  iosFullscreenSizeMultiplier: 0.8,
};

export const videoWatermarkSettingsSelect = {
  opacity: true,
  sizeMultiplier: true,
  mobileSizeMultiplier: true,
  fullscreenSizeMultiplier: true,
  iosFullscreenSizeMultiplier: true,
} as const;

export function normalizeVideoWatermarkSettings(
  settings?: Partial<VideoWatermarkSettings> | null
): VideoWatermarkSettings {
  return {
    opacity: settings?.opacity ?? defaultVideoWatermarkSettings.opacity,
    sizeMultiplier: settings?.sizeMultiplier ?? defaultVideoWatermarkSettings.sizeMultiplier,
    mobileSizeMultiplier:
      settings?.mobileSizeMultiplier ?? defaultVideoWatermarkSettings.mobileSizeMultiplier,
    fullscreenSizeMultiplier:
      settings?.fullscreenSizeMultiplier ?? defaultVideoWatermarkSettings.fullscreenSizeMultiplier,
    iosFullscreenSizeMultiplier:
      settings?.iosFullscreenSizeMultiplier ??
      defaultVideoWatermarkSettings.iosFullscreenSizeMultiplier,
  };
}
