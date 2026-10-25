import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { LibraryAdminPage } from './library-admin-page';

const repository = vi.hoisted(() => ({
  createLibraryCategory: vi.fn(),
  deleteLibraryCategory: vi.fn(),
  listLibraryCategories: vi.fn(),
  listLibraryDocumentsAdmin: vi.fn(),
  reorderLibraryCategories: vi.fn(),
  updateLibraryCategory: vi.fn(),
  updateLibraryDocument: vi.fn(),
  cleanupLibraryUploads: vi.fn(),
  deleteLibraryDocument: vi.fn(),
  reconcileLibraryDocument: vi.fn(),
  recoverLibraryUpload: vi.fn(),
}));

vi.mock('../library-repository', async (importOriginal) => ({ ...await importOriginal<typeof import('../library-repository')>(), ...repository }));

describe('LibraryAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.listLibraryCategories.mockResolvedValue([
      { id: 'medical', name: 'Đông y – Tây y', position: 0 },
      { id: 'history', name: 'Sử học', position: 1 },
    ]);
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

  it('filters books by category and resets the filter', async () => {
    const user = userEvent.setup();
    render(<LibraryAdminPage />);
    await screen.findByRole('link', { name: 'Xem' });
    await user.click(screen.getByRole('button', { name: 'Sử học 0' }));
    expect(screen.queryByRole('link', { name: 'Xem' })).not.toBeInTheDocument();
    expect(screen.getByText('Chưa có tài liệu trong đầu mục này')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(screen.getByRole('link', { name: 'Xem' })).toBeInTheDocument();
  });

  it('finds text beyond the first 120 characters of a book title', async () => {
    const rows = await repository.listLibraryDocumentsAdmin();
    const title = `${'Tài liệu '.repeat(20)}Văn hóa học`;
    repository.listLibraryDocumentsAdmin.mockResolvedValue([{ ...rows[0], title }]);
    const user = userEvent.setup();
    render(<LibraryAdminPage />);
    await screen.findByRole('link', { name: 'Xem' });
    await user.type(screen.getByRole('searchbox'), 'van hoa hoc');
    expect(screen.getByRole('link', { name: title })).toBeInTheDocument();
  });

  it('searches without Vietnamese accents and keeps upload tools collapsed', async () => {
    const user = userEvent.setup();
    render(<LibraryAdminPage />);
    await screen.findByRole('link', { name: 'Xem' });
    expect(screen.getByRole('button', { name: 'Import nhiều PDF' })).not.toBeVisible();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm trong thư viện' }), 'tai lieu cong khai');
    expect(screen.getByRole('link', { name: 'Tài liệu công khai' })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'khong ton tai');
    expect(screen.getByText('Không tìm thấy tài liệu')).toBeInTheDocument();
    await user.click(screen.getByText(/Quản lý thư viện/));
    expect(screen.getByRole('button', { name: 'Import nhiều PDF' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Kiểm tra và dàn xếp' })).toBeVisible();
  });
});
