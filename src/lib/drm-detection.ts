/**
 * DRM Detection and Capability Utilities
 * Detects browser/device DRM capabilities and determines optimal DRM configuration
 */

export interface DRMCapabilities {
  widevine: boolean;
  widevineL1: boolean;
  playready: boolean;
  fairplay: boolean;
  supportedSystems: string[];
  recommendedDRM: 'widevine' | 'playready' | 'fairplay' | null;
  supportsHardwareDRM: boolean;
}

export interface DRMConfig {
  drmType: 'widevine' | 'playready' | 'fairplay';
  manifestUrl: string;
  protocol: 'DASH' | 'HLS';
  robustness?: string;
  requiresL1: boolean;
  isClearPlayback?: boolean;
}

export const FAIRPLAY_KEY_SYSTEM = 'com.apple.fps';

/**
 * Detect all DRM capabilities using EME API
 */
export async function detectDRMCapabilities(): Promise<DRMCapabilities> {
  const capabilities: DRMCapabilities = {
    widevine: false,
    widevineL1: false,
    playready: false,
    fairplay: false,
    supportedSystems: [],
    recommendedDRM: null,
    supportsHardwareDRM: false,
  };

  // Check if EME is supported
  if (!navigator.requestMediaKeySystemAccess) {
    console.warn('EME API not supported in this browser');
    return capabilities;
  }

  const videoConfig = [{
    initDataTypes: ['cenc'],
    videoCapabilities: [{
      contentType: 'video/mp4;codecs="avc1.42E01E"',
    }],
    audioCapabilities: [{
      contentType: 'audio/mp4;codecs="mp4a.40.2"',
    }],
  }];

  const fairPlayConfig = [{
    initDataTypes: ['skd'],
    videoCapabilities: [{
      contentType: 'video/mp4;codecs="avc1.42E01E"',
    }],
    audioCapabilities: [{
      contentType: 'audio/mp4;codecs="mp4a.40.2"',
    }],
  }];

  // Check Widevine L3
  try {
    await navigator.requestMediaKeySystemAccess('com.widevine.alpha', videoConfig);
    capabilities.widevine = true;
    capabilities.supportedSystems.push('widevine');
    console.log('✅ Widevine L3 supported');
  } catch (e) {
    console.log('❌ Widevine not supported');
  }

  // Check Widevine L1
  if (capabilities.widevine) {
    try {
      const l1Config = [{
        initDataTypes: ['cenc'],
        videoCapabilities: [{
          contentType: 'video/mp4;codecs="avc1.42E01E"',
          robustness: 'HW_SECURE_ALL', // L1
        }],
        audioCapabilities: [{
          contentType: 'audio/mp4;codecs="mp4a.40.2"',
          robustness: 'HW_SECURE_ALL',
        }],
      }];
      await navigator.requestMediaKeySystemAccess('com.widevine.alpha', l1Config);
      capabilities.widevineL1 = true;
      capabilities.supportsHardwareDRM = true;
      console.log('✅ Widevine L1 (Hardware DRM) supported');
    } catch (e) {
      console.log('⚠️ Widevine L1 not supported - falling back to L3');
    }
  }

  // Check PlayReady
  try {
    await navigator.requestMediaKeySystemAccess('com.microsoft.playready', videoConfig);
    capabilities.playready = true;
    capabilities.supportedSystems.push('playready');
    capabilities.supportsHardwareDRM = true; // PlayReady typically uses hardware
    console.log('✅ PlayReady supported');
  } catch (e) {
    console.log('❌ PlayReady not supported');
  }

  // Check FairPlay
  try {
    await navigator.requestMediaKeySystemAccess(FAIRPLAY_KEY_SYSTEM, fairPlayConfig);
    capabilities.fairplay = true;
    capabilities.supportedSystems.push('fairplay');
    capabilities.supportsHardwareDRM = true; // FairPlay always uses hardware
    console.log('✅ FairPlay supported');
  } catch (e) {
    console.log('❌ FairPlay not supported');
  }

  // Determine recommended DRM based on priority
  if (capabilities.fairplay) {
    capabilities.recommendedDRM = 'fairplay';
  } else if (capabilities.playready) {
    capabilities.recommendedDRM = 'playready';
  } else if (capabilities.widevine) {
    capabilities.recommendedDRM = 'widevine';
  }

  return capabilities;
}

/**
 * Get optimal DRM configuration based on device/browser
 */
export function getOptimalDRMConfig(
  dashUrl: string | null,
  hlsUrl: string | null,
  requireHD: boolean = false,
  isClearHlsFallback: boolean = false,
  isFairPlayConfigured: boolean = false,
  capabilities?: DRMCapabilities
): DRMConfig | null {
  const ua = navigator.userAgent;

  // IMPORTANT: Check browser BEFORE platform to avoid misrouting

  // 1. iOS - Check device first (all browsers on iOS use WebKit)
  if (/iPhone|iPad|iPod/.test(ua)) {
    if (!hlsUrl) {
      console.warn('HLS manifest required for iOS but not available');
      return null;
    }

    if (isClearHlsFallback) {
      console.warn('⚠️ Using clear HLS fallback on iOS');
      return {
        drmType: 'fairplay',
        manifestUrl: hlsUrl,
        protocol: 'HLS',
        requiresL1: false,
        isClearPlayback: true,
      };
    }

    if (!isFairPlayConfigured) {
      console.warn('FairPlay is not configured and no clear HLS fallback is available for iOS');
      return null;
    }

    return {
      drmType: 'fairplay',
      manifestUrl: hlsUrl,
      protocol: 'HLS',
      requiresL1: true,
    };
  }

  // 2. Safari on Mac - FairPlay (when cert available)
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) {
    if (!hlsUrl) {
      console.warn('HLS manifest required for Safari but not available');
      return null;
    }

    if (isClearHlsFallback) {
      console.warn('⚠️ Using clear HLS fallback on Safari');
      return {
        drmType: 'fairplay',
        manifestUrl: hlsUrl,
        protocol: 'HLS',
        requiresL1: false,
        isClearPlayback: true,
      };
    }

    if (!isFairPlayConfigured) {
      console.warn('FairPlay is not configured and no clear HLS fallback is available for Safari');
      return null;
    }

    return {
      drmType: 'fairplay',
      manifestUrl: hlsUrl,
      protocol: 'HLS',
      requiresL1: true,
    };
  }

  // 3. Microsoft Edge on Windows - PlayReady (hardware DRM)
  if (/Edg/.test(ua) && /Windows/.test(ua)) {
    if (!dashUrl) {
      console.warn('DASH manifest required for PlayReady but not available');
      return null;
    }

    if (capabilities?.widevine) {
      console.log('Using Widevine L3 for Edge to avoid untested PlayReady 3000 playback');
      return {
        drmType: 'widevine',
        manifestUrl: dashUrl,
        protocol: 'DASH',
        robustness: 'SW_SECURE_CRYPTO',
        requiresL1: false,
      };
    }

    console.log('🔐 Using PlayReady for Edge');
    return {
      drmType: 'playready',
      manifestUrl: dashUrl,
      protocol: 'DASH',
      requiresL1: true, // PlayReady supports hardware DRM
    };
  }

  // 4. Chrome/Firefox and other browsers - Widevine
  if (!dashUrl) {
    console.warn('DASH manifest required for Widevine but not available');
    return null;
  }

  // Determine robustness based on platform
  // Desktop browsers (Windows/Mac/Linux) only support L3
  // Mobile Android can attempt L1 with auto-fallback
  const isAndroid = /Android/.test(ua);
  const isMobile = /Mobile|Android/.test(ua);
  const isDesktop = !isMobile;

  if (isDesktop) {
    console.log('🔐 Using Widevine L3 (software) for desktop browser');
  } else {
    console.log('🔐 Attempting Widevine L1 (hardware) for mobile - will fallback to L3 if needed');
  }

  return {
    drmType: 'widevine',
    manifestUrl: dashUrl,
    protocol: 'DASH',
    // Desktop: Always use L3 (SW_SECURE_CRYPTO)
    // Mobile Android: Try L1 (HW_SECURE_ALL) with auto-fallback
    robustness: isDesktop ? 'SW_SECURE_CRYPTO' : 'HW_SECURE_ALL',
    requiresL1: !isDesktop, // Only try L1 on mobile
  };
}

/**
 * Simple browser detection for logging
 */
export function getBrowserInfo(): {
  browser: string;
  os: string;
  isMobile: boolean;
} {
  const ua = navigator.userAgent;

  let browser = 'Unknown';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Unknown';
  // Check Android FIRST before Linux (Android UA includes "Linux")
  if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  const isMobile = /Mobile|Android|iPhone|iPad|iPod/.test(ua);

  return { browser, os, isMobile };
}

/**
 * Check if device likely supports Widevine L1
 * Note: This is a heuristic - actual support must be tested with EME API
 */
export function likelySupportsWidevineL1(): boolean {
  const ua = navigator.userAgent;

  // Desktop browsers typically only support L3
  if (!/Mobile|Android/.test(ua)) {
    return false;
  }

  // Android devices may support L1 if they have proper hardware
  // Most modern Android devices (2018+) with certified hardware support L1
  if (/Android/.test(ua)) {
    // This is just a hint - actual detection happens via EME API
    return true;
  }

  return false;
}
