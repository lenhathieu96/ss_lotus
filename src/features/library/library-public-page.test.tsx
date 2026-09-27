import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPublicPage } from './library-public-page';

const { listLibraryCategories, searchLibraryDocuments } = vi.hoisted(() => ({
  listLibraryCategories: vi.fn(),
  searchLibraryDocuments: vi.fn(),
}));

vi.mock('./library-repository', () => ({ listLibraryCategories, searchLibraryDocuments }));

describe('LibraryPublicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listLibraryCategories.mockResolvedValue([{ id: 'cat-history', name: 'Sử học', position: 0 }]);
    searchLibraryDocuments.mockResolvedValue([{ id: 'doc-1', categoryId: 'cat-history', categoryName: 'Sử học', title: 'Đại Việt sử ký', author: 'Ngô Sĩ Liên', publishedAt: '2026-09-26T10:00:00Z' }]);
  });

  it('shows public documents and searches by user input', async () => {
    const user = userEvent.setup();
    render(<LibraryPublicPage />);
    expect(await screen.findByRole('link', { name: 'Đại Việt sử ký' })).toHaveAttribute('href', '/thu-vien/doc-1');
    await user.type(screen.getByRole('searchbox', { name: 'Tìm theo tên tài liệu hoặc tác giả' }), 'phật học');
    await waitFor(() => expect(searchLibraryDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'phật học' })));
  });

  it('ignores a slower response from an outdated query', async () => {
    const pending: Record<string, (rows: { id: string; categoryId: string; categoryName: string; title: string; author: string; publishedAt: string }[]) => void> = {};
    searchLibraryDocuments.mockImplementation(({ query }: { query: string }) => new Promise((resolve) => {
      pending[query] = resolve;
    }));
    render(<LibraryPublicPage />);

    await waitFor(() => expect(pending['']).toBeDefined());
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm theo tên tài liệu hoặc tác giả' }), { target: { value: 'mới' } });
    await waitFor(() => expect(pending['mới']).toBeDefined());

    await act(async () => pending['mới']([{ id: 'new', categoryId: 'cat-history', categoryName: 'Sử học', title: 'Kết quả mới', author: 'Tác giả mới', publishedAt: '2026-09-27T10:00:00Z' }]));
    await act(async () => pending['']([{ id: 'old', categoryId: 'cat-history', categoryName: 'Sử học', title: 'Kết quả cũ', author: 'Tác giả cũ', publishedAt: '2026-09-27T09:00:00Z' }]));

    expect(await screen.findByRole('link', { name: 'Kết quả mới' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Kết quả cũ' })).not.toBeInTheDocument();
  });
});
