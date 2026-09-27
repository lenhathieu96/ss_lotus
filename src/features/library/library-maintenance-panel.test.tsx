import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryAdminDocument } from './library-domain';
import { LibraryMaintenancePanel } from './library-maintenance-panel';

describe('LibraryMaintenancePanel', () => {
  it('offers reconciliation for an interrupted delete', async () => {
    const user = userEvent.setup();
    const onReconcileDelete = vi.fn().mockResolvedValue(undefined);
    const document: LibraryAdminDocument = {
      id: 'doc-1', categoryId: 'cat-1', categoryName: 'Sử học', title: 'Tài liệu', author: null,
      publishedAt: '2026-09-26T12:00:00Z', originalFilename: 'file.pdf', storagePath: 'documents/doc-1.pdf',
      status: 'deleting', createdByUserId: 'admin-1', createdAt: '2026-09-26T12:00:00Z', uploadExpiresAt: null, cleanupClaimUntil: null,
    };
    render(<LibraryMaintenancePanel documents={[document]} onCleanup={vi.fn()} onReconcileDelete={onReconcileDelete} onRecoverUpload={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái xóa' }));
    expect(onReconcileDelete).toHaveBeenCalledWith(document);
  });

  it('offers recovery for a cleaning upload and shows its safe outcome', async () => {
    const user = userEvent.setup();
    const onRecoverUpload = vi.fn().mockResolvedValue('S3 từ chối đọc file chờ xử lý.');
    const document: LibraryAdminDocument = {
      id: 'doc-2', categoryId: 'cat-1', categoryName: 'Sử học', title: 'Tài liệu kẹt', author: null,
      publishedAt: '2026-09-26T12:00:00Z', originalFilename: 'file.pdf', storagePath: 'documents/doc-2.pdf',
      status: 'cleaning', createdByUserId: 'admin-1', createdAt: '2026-09-26T12:00:00Z', uploadExpiresAt: '2026-09-26T12:15:00Z', cleanupClaimUntil: null,
    };
    render(<LibraryMaintenancePanel documents={[document]} onCleanup={vi.fn()} onReconcileDelete={vi.fn()} onRecoverUpload={onRecoverUpload} />);
    await user.click(screen.getByRole('button', { name: 'Kiểm tra và dàn xếp' }));
    expect(onRecoverUpload).toHaveBeenCalledWith(document);
    expect(await screen.findByRole('alert')).toHaveTextContent('S3 từ chối đọc file chờ xử lý.');
  });
});
