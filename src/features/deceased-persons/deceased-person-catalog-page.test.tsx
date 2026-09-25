import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeceasedPerson } from './deceased-person-domain';

const repository = vi.hoisted(() => ({
  createDeceasedPerson: vi.fn(),
  importDeceasedPeople: vi.fn(),
  listDeceasedPeople: vi.fn(),
}));

vi.mock('./deceased-person-repository', () => repository);

import { DeceasedPersonCatalogPage } from './deceased-person-catalog-page';

describe('DeceasedPersonCatalogPage', () => {
  const people: DeceasedPerson[] = [];

  beforeEach(() => {
    people.splice(0);
    repository.listDeceasedPeople.mockImplementation(async () => [...people]);
    repository.createDeceasedPerson.mockImplementation(async (person: DeceasedPerson) => { people.push(person); });
    repository.importDeceasedPeople.mockImplementation(async (batch: DeceasedPerson[]) => { people.push(...batch); });
  });

  it('loads the persisted catalog and adds a valid record through the repository', async () => {
    render(<DeceasedPersonCatalogPage />);
    expect(screen.getByRole('heading', { name: 'Danh sách người đã mất' })).toBeInTheDocument();
    await screen.findByText('Chưa có người đã mất trong danh mục.');
    fireEvent.change(screen.getByLabelText('Mã số'), { target: { value: 'ns-01' } });
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Văn An' } });
    fireEvent.change(screen.getByLabelText('Ngày mất'), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText('Người đăng ký'), { target: { value: 'Admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }));
    await waitFor(() => expect(repository.createDeceasedPerson).toHaveBeenCalledWith(expect.objectContaining({ code: 'NS-01', householdReference: '', familyReference: '' })));
    expect(await screen.findByText('NGUYỄN VĂN AN')).toBeInTheDocument();
  });

  it('keeps invalid records out before calling the repository', async () => {
    render(<DeceasedPersonCatalogPage />);
    await screen.findByText('Chưa có người đã mất trong danh mục.');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Mã số là bắt buộc');
    expect(repository.createDeceasedPerson).not.toHaveBeenCalled();
  });
});
