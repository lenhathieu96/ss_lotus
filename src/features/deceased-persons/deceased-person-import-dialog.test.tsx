import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeceasedPersonImportDialog } from './deceased-person-import-dialog';

const csv = 'ma_so,ho_ten,phap_danh,ngay_mat,nguoi_lap,ma_ho,ma_gia_dinh\nNS-02,Nguyễn Văn B,,01/01,Admin,1,2';
describe('DeceasedPersonImportDialog', () => {
  it('previews a local CSV and confirms one valid batch', async () => {
    const onConfirm = vi.fn(async () => undefined); render(<DeceasedPersonImportDialog existingCodes={[]} onConfirm={onConfirm} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Chọn file CSV'), { target: { files: [new File([csv], 'nguoi-da-mat.csv', { type: 'text/csv' })] } });
    await screen.findByText('1 dòng hợp lệ, 0 dòng lỗi');
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thêm 1 người' }));
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ code: 'NS-02', dateOfDeath: { day: 1, month: 1, isLeap: false } })]);
  });
  it('blocks confirm when the preview contains duplicate code', async () => {
    render(<DeceasedPersonImportDialog existingCodes={['NS-02']} onConfirm={async () => undefined} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Chọn file CSV'), { target: { files: [new File([csv], 'nguoi-da-mat.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText(/Mã số trùng/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Xác nhận thêm/i })).toBeDisabled();
  });
});
