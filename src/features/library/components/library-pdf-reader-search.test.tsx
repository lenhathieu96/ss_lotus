import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryPdfReaderSearch } from './library-pdf-reader-search';

describe('LibraryPdfReaderSearch', () => {
  it('submits a query, changes direction, and announces a zero-result state', async () => {
    const user = userEvent.setup();
    const onFind = vi.fn();
    const onClear = vi.fn();
    const { rerender } = render(<LibraryPdfReaderSearch currentMatch={0} findState="idle" onClear={onClear} onFind={onFind} totalMatches={0} />);

    await user.type(screen.getByRole('searchbox', { name: 'Tìm trong tài liệu' }), 'pháp danh');
    await user.click(screen.getByRole('button', { name: 'Tìm' }));
    expect(onFind).toHaveBeenCalledWith('pháp danh');
    await user.click(screen.getByRole('button', { name: 'Kết quả trước' }));
    expect(onFind).toHaveBeenLastCalledWith('pháp danh', { findAgain: true, findPrevious: true });
    await user.click(screen.getByRole('button', { name: 'Kết quả tiếp theo' }));
    expect(onFind).toHaveBeenLastCalledWith('pháp danh', { findAgain: true });

    rerender(<LibraryPdfReaderSearch currentMatch={0} findState="not-found" onClear={onClear} onFind={onFind} totalMatches={0} />);
    expect(screen.getByText('Không tìm thấy nội dung phù hợp.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
