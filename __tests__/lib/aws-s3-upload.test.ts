import { buildS3SourceKey } from '@/lib/media-provider/aws-s3';

describe('AWS S3 media upload helpers', () => {
  it('builds stable source key from video ID and extension', () => {
    expect(buildS3SourceKey({ videoId: 'video-1', filename: 'Lecture 01.MP4' }))
      .toBe('videos/video-1/source.mp4');
  });

  it('uses mp4 extension when filename has no extension', () => {
    expect(buildS3SourceKey({ videoId: 'video-1', filename: 'lecture' }))
      .toBe('videos/video-1/source.mp4');
  });
});
