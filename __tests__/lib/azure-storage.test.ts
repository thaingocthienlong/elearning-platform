jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn(),
  BlobSASPermissions: {
    parse: jest.fn(),
  },
  StorageSharedKeyCredential: jest.fn(),
  generateBlobSASQueryParameters: jest.fn(),
}));

describe('azure storage baseline behavior', () => {
  const originalAccount = process.env.AZURE_STORAGE_ACCOUNT;
  const originalKey = process.env.AZURE_STORAGE_KEY;

  afterEach(() => {
    process.env.AZURE_STORAGE_ACCOUNT = originalAccount;
    process.env.AZURE_STORAGE_KEY = originalKey;
    jest.resetModules();
  });

  test('can be imported during local builds without Azure credentials', async () => {
    delete process.env.AZURE_STORAGE_ACCOUNT;
    delete process.env.AZURE_STORAGE_KEY;
    jest.resetModules();

    const { azureStorage } = await import('@/lib/azure-storage');

    expect(azureStorage.accountName).toBe('');
    await expect(azureStorage.getUploadSasUrl('sample.mp4')).rejects.toThrow(
      'Azure Storage is not configured'
    );
  });
});
