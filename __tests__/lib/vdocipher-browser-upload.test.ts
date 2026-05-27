import { uploadFileToVdoCipher } from '@/lib/vdocipher-browser-upload';

describe('vdocipher browser upload', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('posts multipart policy fields and file to VdoCipher upload link', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 201 });
    const file = new File(['video-bytes'], 'lesson.mp4', { type: 'video/mp4' });

    const response = await uploadFileToVdoCipher({
      file,
      clientPayload: {
        uploadLink: 'https://vdo-ap-southeast.s3-accelerate.amazonaws.com/',
        policy: 'policy-value',
        key: 'key-value',
        'x-amz-signature': 'signature-value',
        'x-amz-algorithm': 'AWS4-HMAC-SHA256',
        'x-amz-date': '20260527T010203Z',
        'x-amz-credential': 'credential-value',
      },
    });

    expect(response.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://vdo-ap-southeast.s3-accelerate.amazonaws.com/',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );

    const formData = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
    expect(formData.get('policy')).toBe('policy-value');
    expect(formData.get('key')).toBe('key-value');
    expect(formData.get('x-amz-signature')).toBe('signature-value');
    expect(formData.get('x-amz-algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(formData.get('x-amz-date')).toBe('20260527T010203Z');
    expect(formData.get('x-amz-credential')).toBe('credential-value');
    expect(formData.get('success_action_status')).toBe('201');
    expect(formData.get('success_action_redirect')).toBe('');
    expect(formData.get('file')).toBe(file);
  });

  it('rejects missing required upload policy fields', async () => {
    const file = new File(['video-bytes'], 'lesson.mp4', { type: 'video/mp4' });

    await expect(
      uploadFileToVdoCipher({
        file,
        clientPayload: {
          uploadLink: 'https://vdo-ap-southeast.s3-accelerate.amazonaws.com/',
          policy: 'policy-value',
        },
      })
    ).rejects.toThrow('VdoCipher upload response missing key');

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
