'use client';

import { useState, type ReactNode } from 'react';
import { ArrowLeft, FolderTree, ListChecks, Upload, Files } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@components/ui/dialog';

type ManagementView = 'home' | 'categories' | 'uploads';

export function LibraryManagementDialog({ onClose, onSingleUpload, onBatchUpload, pendingCount, busy, categories, uploads }: {
  onClose: () => void;
  onSingleUpload: () => void;
  onBatchUpload: () => void;
  pendingCount: number;
  busy: boolean;
  categories: ReactNode;
  uploads: ReactNode;
}) {
  const [view, setView] = useState<ManagementView>('home');
  const title = view === 'categories' ? 'Quản lý đầu mục' : view === 'uploads' ? 'Lượt tải cần xử lý' : 'Quản lý thư viện';

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="library-management-dialog" showCloseButton={false}>
      <DialogHeader>
        <div className="library-management-heading">
          {view !== 'home' && <Button variant="ghost" size="icon" disabled={busy} aria-label="Quay lại quản lý thư viện" onClick={() => setView('home')}><ArrowLeft aria-hidden="true" /></Button>}
          <div><DialogTitle>{title}</DialogTitle><DialogDescription>{view === 'home' ? 'Chọn công việc bạn muốn thực hiện.' : view === 'categories' ? 'Thêm, đổi tên và sắp xếp các đầu mục tài liệu.' : 'Kiểm tra các lượt tải chưa hoàn tất và trạng thái xóa.'}</DialogDescription></div>
        </div>
      </DialogHeader>
      <div className="library-management-body">
        {view === 'home' ? <>
          <div className="library-management-options">
            <Button variant="outline" onClick={onSingleUpload}><Upload aria-hidden="true" /><span><strong>Thêm tài liệu</strong><small>Tải một PDF và điền thông tin sách.</small></span></Button>
            <Button variant="outline" onClick={onBatchUpload}><Files aria-hidden="true" /><span><strong>Import nhiều PDF</strong><small>Thêm nhiều tài liệu trong một lượt.</small></span></Button>
            <Button variant="outline" onClick={() => setView('categories')}><FolderTree aria-hidden="true" /><span><strong>Quản lý đầu mục</strong><small>Thêm, đổi tên và thay đổi thứ tự.</small></span></Button>
            <Button variant="outline" onClick={() => setView('uploads')}><ListChecks aria-hidden="true" /><span><strong>Lượt tải cần xử lý{pendingCount > 0 ? ` (${pendingCount})` : ''}</strong><small>{pendingCount ? 'Có lượt tải cần kiểm tra.' : 'Không có lượt tải cần xử lý.'}</small></span></Button>
          </div>
          <p className="library-management-hint">Mỗi tệp PDF có dung lượng tối đa 100 MB.</p>
        </> : view === 'categories' ? categories : pendingCount ? uploads : <p className="empty-panel" role="status">Tất cả lượt tải đã được xử lý.</p>}
      </div>
      <div className="library-management-footer"><Button variant="secondary" disabled={busy} onClick={onClose}>{busy ? 'Đang xử lý…' : 'Đóng'}</Button></div>
    </DialogContent>
  </Dialog>;
}
