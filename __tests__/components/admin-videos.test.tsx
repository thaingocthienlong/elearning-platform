import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminVideosPage from '@/app/admin/videos/page';

const mockRefetch = jest.fn();
const mockUploader = {
  on: jest.fn(),
  done: jest.fn(),
};
const mockUpload = jest.fn(() => mockUploader);
const MockTencentVod = jest.fn().mockImplementation(() => ({ upload: mockUpload }));
const mockVideo = {
  id: '64b7f0000000000000000002',
  title: 'Tencent lesson',
  createdAt: '2026-07-13T00:00:00.000Z',
  published: false,
  description: null,
  dashUrl: null,
  hlsUrl: null,
  hlsUrlClear: null,
  tencentFileId: 'file-1',
  tencentTaskId: null,
  tencentStatus: 'READY',
  tencentAppleFallbackDrmType: null,
  tencentSyncedAt: null,
  tencentDeletedAt: null,
};

jest.mock('@/hooks/admin/useAdminData', () => ({
  useAdminData: () => ({ data: [mockVideo], loading: false, refetch: mockRefetch }),
}));
jest.mock('@/hooks/admin/useAdminFilters', () => ({
  useAdminFilters: (data: unknown[]) => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    filteredData: data,
  }),
}));
jest.mock('@/hooks/admin/useTablePagination', () => ({
  useTablePagination: (data: unknown[]) => ({
    paginatedData: data,
    currentPage: 1,
    totalPages: 1,
    nextPage: jest.fn(),
    prevPage: jest.fn(),
  }),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('vod-js-sdk-v6', () => ({
  __esModule: true,
  default: MockTencentVod,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUploader.done.mockResolvedValue({
    fileId: 'tencent-file-id',
    video: { url: 'https://media.example/video.mp4' },
  });
  Object.defineProperty(window, 'confirm', { value: jest.fn(() => true), writable: true });
});

test('delete control calls the provider-backed admin route and refreshes the list', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, alreadyDeleted: false }),
  }) as jest.Mock;

  render(<AdminVideosPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    '/api/admin/videos/64b7f0000000000000000002',
    { method: 'DELETE' }
  ));
  await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
});

test('upload dialog loads the complete admin course list', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ id: 'course-1', title: 'Draft course' }],
  }) as jest.Mock;

  render(<AdminVideosPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Upload New Video' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/admin/courses'));
});

test('upload starts WV-SAES-V1 once and never calls the legacy process endpoint', async () => {
  global.fetch = jest.fn((url: string) => {
    if (url === '/api/admin/courses') {
      return Promise.resolve({ ok: true, json: async () => [{ id: 'course-1', title: 'Draft course' }] });
    }
    if (url === '/api/upload/presigned') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          videoId: '64b7f0000000000000000002',
          uploadSignature: 'signature-with-WV-SAES-V1',
          tencentSubAppId: 123456,
        }),
      });
    }
    if (url === '/api/upload/complete') {
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    }
    return Promise.reject(new Error(`Unexpected fetch ${url}`));
  }) as jest.Mock;

  render(<AdminVideosPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Upload New Video' }));
  await screen.findByRole('option', { name: 'Draft course' });
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Lesson 1' } });
  fireEvent.change(screen.getByLabelText('Video File'), {
    target: { files: [new File(['video'], 'lesson.mp4', { type: 'video/mp4' })] },
  });
  fireEvent.submit(screen.getByRole('button', { name: 'Upload' }).closest('form')!);

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/upload/complete', expect.objectContaining({
    method: 'POST',
  })));
  await waitFor(() => expect(screen.getByText('Upload complete. Tencent is processing WV-SAES-V1 (720p).')).toBeInTheDocument());
  expect(mockUpload).toHaveBeenCalledTimes(1);
  const sdkConfig = MockTencentVod.mock.calls[0][0];
  await expect(sdkConfig.getSignature()).resolves.toBe('signature-with-WV-SAES-V1');
  expect(global.fetch).not.toHaveBeenCalledWith('/api/video/process', expect.anything());
});
