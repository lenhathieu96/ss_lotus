import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryCategoryManager } from './library-category-manager';

describe('LibraryCategoryManager', () => {
  it('creates categories and sends a complete reordered ID list', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onReorder = vi.fn().mockResolvedValue(undefined);
    render(<LibraryCategoryManager categories={[{ id: 'history', name: 'Sử học', position: 0 }, { id: 'literature', name: 'Văn học', position: 1 }]} onCreate={onCreate} onUpdate={vi.fn()} onReorder={onReorder} onDelete={vi.fn()} />);
    await user.type(screen.getByLabelText('Thêm đầu mục'), 'Triết học');
    await user.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(onCreate).toHaveBeenCalledWith('Triết học');
    await user.click(screen.getByRole('button', { name: 'Chuyển Sử học xuống' }));
    expect(onReorder).toHaveBeenCalledWith(['literature', 'history']);
  });
});
