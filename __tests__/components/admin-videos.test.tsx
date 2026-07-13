import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminVideosPage from '@/app/admin/videos/page';

const mockRefetch = jest.fn();
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

beforeEach(() => {
  jest.clearAllMocks();
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
