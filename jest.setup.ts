//jest.setup.ts
// Test environment configuration with MOCK values only
// NEVER commit production secrets to this file

import '@testing-library/jest-dom';

// Auth Mocks
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.AUTH_SECRET = 'test-auth-secret-minimum-32-characters-long';

// Redis Mocks (use local Redis or mock in tests)
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:6379';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';
process.env.REDIS_URL = 'redis://localhost:6379';

// reCAPTCHA (test keys - Google provides these for testing)
process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
process.env.RECAPTCHA_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

// DRM (mock keys - not real encryption keys)
process.env.DRM_JWT_PRIVATE_KEY = 'test-drm-private-key';
process.env.DRM_JWT_PUBLIC_KEY = 'test-drm-public-key';
process.env.PLAYBACK_JWT_SECRET = 'test-playback-jwt-secret';

// AWS/Cloud Mocks
process.env.AWS_REGION = 'us-east-1';
process.env.KMS_KEY_ALIAS = 'alias/test-key';

// Database (use local MongoDB for tests)
process.env.DATABASE_URL = 'mongodb://localhost:27017/test_secure_video_platform';

// Storage Mocks
process.env.R2_ENDPOINT = 'http://localhost:9000';
process.env.R2_ACCESS_KEY_ID = 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.R2_BUCKET = 'test-bucket';
process.env.R2_PREFIX = 'test';
process.env.NEXT_PUBLIC_ASSET_BASE = 'http://localhost:9000/test-bucket';

// Azure Storage Mocks
process.env.AZURE_STORAGE_ACCOUNT = 'testaccount';
process.env.AZURE_STORAGE_KEY = 'test-azure-key';
process.env.AZURE_VIDEO_OUTPUT_CONTAINER = 'test-output';

// Axinom Mocks
process.env.AXINOM_COM_KEY_ID = 'test-key-id';
process.env.AXINOM_COM_KEY_SECRET = 'test-key-secret';
process.env.AXINOM_WV_LS_URL = 'http://localhost:8080/license';
process.env.AXINOM_FP_LS_URL = 'http://localhost:8080/license';
process.env.NEXT_PUBLIC_AX_WV_LS_URL = 'http://localhost:8080/license';
process.env.NEXT_PUBLIC_AX_FP_LS_URL = 'http://localhost:8080/license';

// Zoom Mocks
process.env.ZOOM_MEETING_SDK_KEY = 'test-zoom-sdk-key';
process.env.ZOOM_MEETING_SDK_SECRET = 'test-zoom-sdk-secret';
