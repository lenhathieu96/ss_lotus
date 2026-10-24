import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryBatchUploadDialog } from './library-batch-upload-dialog';

describe('LibraryBatchUploadDialog', () => {
  it('updates the default and queued file categories after async category loading', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onComplete = vi.fn();
    const { rerender } = render(<LibraryBatchUploadDialog open categories={[]} onClose={onClose} onComplete={onComplete} />);
    const file = new File(['%PDF-1.4'], 'book.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Chọn nhiều tệp PDF'), file);

    rerender(<LibraryBatchUploadDialog open categories={[{ id: 'history', name: 'Sử học', position: 0 }]} onClose={onClose} onComplete={onComplete} />);

    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toHaveValue('history');
      expect(selects[1]).toHaveValue('history');
    });
  });
});
