import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryAdminPage } from './library-admin-page';

const repository = vi.hoisted(() => ({
  createLibraryCategory: vi.fn(),
  deleteLibraryCategory: vi.fn(),
  listLibraryCategories: vi.fn(),
  listLibraryDocumentsAdmin: vi.fn(),
  reorderLibraryCategories: vi.fn(),
  updateLibraryCategory: vi.fn(),
  updateLibraryDocument: vi.fn(),
}));

vi.mock('./library-repository', () => repository);
vi.mock('@/data/library/library-data-source', () => ({
  libraryDataSource: {
    cleanupUploads: vi.fn(),
    deleteDocument: vi.fn(),
    reconcileDocument: vi.fn(),
    recoverUpload: vi.fn(),
  },
}));

describe('LibraryAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.listLibraryCategories.mockResolvedValue([]);
    repository.listLibraryDocumentsAdmin.mockResolvedValue([
      { id: 'published-document', categoryId: 'medical', categoryName: 'Đông y – Tây y', title: 'Tài liệu công khai', author: null, publishedAt: '2026-09-27T00:00:00Z', originalFilename: 'published.pdf', storagePath: 'documents/published-document.pdf', status: 'published', createdByUserId: 'admin', createdAt: '2026-09-27T00:00:00Z', uploadExpiresAt: null, cleanupClaimUntil: null },
      { id: 'pending-document', categoryId: 'medical', categoryName: 'Đông y – Tây y', title: 'Tài liệu chờ', author: null, publishedAt: '2026-09-27T00:00:00Z', originalFilename: 'pending.pdf', storagePath: 'pending/pending-document.pdf', status: 'pending', createdByUserId: 'admin', createdAt: '2026-09-27T00:00:00Z', uploadExpiresAt: null, cleanupClaimUntil: null },
    ]);
  });

  it('links only published documents to the public reader', async () => {
    render(<LibraryAdminPage />);
    expect(await screen.findByRole('link', { name: 'Xem' })).toHaveAttribute('href', '/thu-vien/published-document');
    expect(screen.getAllByRole('link', { name: 'Xem' })).toHaveLength(1);
  });
});
