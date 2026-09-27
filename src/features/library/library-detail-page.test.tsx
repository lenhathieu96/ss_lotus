import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryDetailPage } from './library-detail-page';

const { getLibraryDocument, libraryDownloadUrl, publicLibraryDocumentUrl } = vi.hoisted(() => ({ getLibraryDocument: vi.fn(), libraryDownloadUrl: vi.fn(() => '/download'), publicLibraryDocumentUrl: vi.fn(() => 'https://example.test/public.pdf') }));
vi.mock('./library-repository', () => ({ getLibraryDocument }));
vi.mock('./library-storage-api', () => ({ publicLibraryDocumentUrl, libraryDownloadUrl }));
vi.mock('./library-pdf-reader', () => ({ LibraryPdfReader: ({ pdfUrl, title }: { pdfUrl: string; title: string }) => <p>{`Reader: ${title} (${pdfUrl})`}</p> }));

describe('LibraryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    libraryDownloadUrl.mockReturnValue('/download');
    publicLibraryDocumentUrl.mockReturnValue('https://example.test/public.pdf');
  });

  it('handles malformed IDs without calling the database', async () => {
    render(<LibraryDetailPage documentId="not-a-uuid" />);
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy tài liệu' })).toBeVisible();
    expect(getLibraryDocument).not.toHaveBeenCalled();
  });

  it('hands a valid public record to the app-controlled reader', async () => {
    getLibraryDocument.mockResolvedValue({ id: '123e4567-e89b-42d3-a456-426614174000', categoryId: 'sut-hoc', categoryName: 'Sử học', title: 'Đại Việt sử ký', author: 'Ngô Sĩ Liên', publishedAt: '2026-09-27T00:00:00Z' });
    render(<LibraryDetailPage documentId="123e4567-e89b-42d3-a456-426614174000" />);
    expect(await screen.findByText('Reader: Đại Việt sử ký (https://example.test/public.pdf)')).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Tải PDF' }).at(-1)).toHaveAttribute('href', '/download');
  });

  it('keeps download available when the public S3 URL is not configured', async () => {
    getLibraryDocument.mockResolvedValue({ id: '123e4567-e89b-42d3-a456-426614174000', categoryId: 'sut-hoc', categoryName: 'Sử học', title: 'Đại Việt sử ký', author: null, publishedAt: '2026-09-27T00:00:00Z' });
    publicLibraryDocumentUrl.mockImplementation(() => { throw new Error('missing configuration'); });
    render(<LibraryDetailPage documentId="123e4567-e89b-42d3-a456-426614174000" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Trình đọc trực tuyến chưa được cấu hình');
    expect(screen.getAllByRole('link', { name: 'Tải PDF' }).at(-1)).toHaveAttribute('href', '/download');
  });
});
