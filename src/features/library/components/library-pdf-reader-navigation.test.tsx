import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPdfReaderNavigation, ReaderOutlineItem } from './library-pdf-reader-navigation';

describe('LibraryPdfReaderNavigation', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  });

  afterEach(() => vi.restoreAllMocks());

  it('uses an embedded internal outline before falling back to thumbnails', async () => {
    const user = userEvent.setup();
    const destination = [0, { name: 'XYZ' }, 0, 0, null];
    const onGoToDestination = vi.fn();
    const onGoToPage = vi.fn();
    const outline: ReaderOutlineItem[] = [{ destination, items: [], title: 'Chương một' }];
    const thumbnailDocument = {
      getPage: vi.fn(async () => ({
        getViewport: () => ({ height: 100, width: 70 }),
        render: () => ({ cancel: vi.fn(), promise: Promise.resolve() }),
      })),
      numPages: 3,
    };

    const { rerender } = render(<LibraryPdfReaderNavigation onGoToDestination={onGoToDestination} onGoToPage={onGoToPage} outline={outline} thumbnailDocument={thumbnailDocument} />);
    await user.click(screen.getByRole('button', { name: 'Chương một' }));
    expect(onGoToDestination).toHaveBeenCalledWith(destination);
    expect(screen.queryByText('Tài liệu chưa có mục lục. Chọn hình thu nhỏ để chuyển trang.')).not.toBeInTheDocument();

    rerender(<LibraryPdfReaderNavigation onGoToDestination={onGoToDestination} onGoToPage={onGoToPage} outline={[]} thumbnailDocument={thumbnailDocument} />);
    expect(screen.getByText('Tài liệu chưa có mục lục. Chọn hình thu nhỏ để chuyển trang.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Đi đến trang 1' }));
    expect(onGoToPage).toHaveBeenCalledWith(1);
  });
});
