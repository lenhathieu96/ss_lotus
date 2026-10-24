import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryUploadForm } from './library-upload-form';

describe('LibraryUploadForm', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens the PDF picker from a clearly labeled button', async () => {
    const user = userEvent.setup();
    const pickerClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<LibraryUploadForm open categories={[]} onClose={vi.fn()} onComplete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Chọn tệp PDF' }));

    expect(pickerClick).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Chọn tệp PDF')).toHaveAttribute('type', 'file');
  });

  it('selects the first category when categories arrive after the form mounts', async () => {
    const { rerender } = render(<LibraryUploadForm open categories={[]} onClose={vi.fn()} onComplete={vi.fn()} />);
    rerender(<LibraryUploadForm open categories={[{ id: 'history', name: 'Sử học', position: 0 }]} onClose={vi.fn()} onComplete={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('history'));
  });
});
