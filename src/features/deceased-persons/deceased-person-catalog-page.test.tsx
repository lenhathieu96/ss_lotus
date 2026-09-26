import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeceasedPerson } from './deceased-person-domain';

const repository = vi.hoisted(() => ({
  createDeceasedPerson: vi.fn(),
  importDeceasedPeople: vi.fn(),
  listDeceasedPeople: vi.fn(),
  updateDeceasedPersonAssociation: vi.fn(),
}));
const prayer = vi.hoisted(() => ({ createMemorialRegistration: vi.fn() }));

vi.mock('./deceased-person-repository', () => repository);
vi.mock('../prayer/prayer-repository', () => prayer);

import { DeceasedPersonCatalogPage } from './deceased-person-catalog-page';

describe('DeceasedPersonCatalogPage', () => {
  const people: DeceasedPerson[] = [];

  beforeEach(() => {
    people.splice(0);
    repository.updateDeceasedPersonAssociation.mockResolvedValue(undefined);
    prayer.createMemorialRegistration.mockResolvedValue(undefined);
    repository.listDeceasedPeople.mockImplementation(async () => [...people]);
    repository.createDeceasedPerson.mockImplementation(async (person: DeceasedPerson) => { people.push(person); });
    repository.importDeceasedPeople.mockImplementation(async (batch: DeceasedPerson[]) => { people.push(...batch); });
  });

  it('loads the persisted catalog and adds a valid record through the repository', async () => {
    render(<DeceasedPersonCatalogPage />);
    expect(screen.getByRole('heading', { name: 'Quản lý hương linh' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tra cứu hương linh' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Mã số')).not.toBeInTheDocument();
    await screen.findByText('Chưa có hương linh phù hợp.');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm hương linh' }));
    expect(screen.getByRole('dialog', { name: 'Thêm hương linh' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mã số'), { target: { value: 'ns-01' } });
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Văn An' } });
    fireEvent.click(screen.getByRole('combobox', { name: 'Ngày' }));
    fireEvent.click(await screen.findByRole('option', { name: '10' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Tháng' }));
    fireEvent.click(await screen.findByRole('option', { name: '02' }));
    fireEvent.change(screen.getByLabelText('Người đăng ký'), { target: { value: 'Admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }));
    await waitFor(() => expect(repository.createDeceasedPerson).toHaveBeenCalledWith(expect.objectContaining({ code: 'NS-01', dateOfDeath: { day: 10, month: 2, isLeap: false }, householdReference: '', familyReference: '' })));
    expect(await screen.findByText('NGUYỄN VĂN AN')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Thêm hương linh' })).not.toBeInTheDocument();
  });

  it('keeps invalid records out before calling the repository', async () => {
    render(<DeceasedPersonCatalogPage />);
    await screen.findByText('Chưa có hương linh phù hợp.');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm hương linh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Mã số là bắt buộc');
    expect(repository.createDeceasedPerson).not.toHaveBeenCalled();
  });

  it('opens an accessible drawer and restores trigger focus after each idle close route', async () => {
    render(<DeceasedPersonCatalogPage />);
    await screen.findByText('Chưa có hương linh phù hợp.');
    const trigger = screen.getByRole('button', { name: 'Thêm hương linh' });

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Thêm hương linh' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Mã số')).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thêm hương linh' }));
    expect(screen.queryByRole('dialog', { name: 'Thêm hương linh' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog', { name: 'Thêm hương linh' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Thêm hương linh' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Thêm hương linh' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    const drawer = screen.getByRole('dialog', { name: 'Thêm hương linh' });
    fireEvent.keyDown(drawer, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Thêm hương linh' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps the drawer open while a valid create request is pending', async () => {
    let resolveCreate: (() => void) | undefined;
    repository.createDeceasedPerson.mockImplementation(
      () => new Promise<void>((resolve) => { resolveCreate = resolve; }),
    );
    render(<DeceasedPersonCatalogPage />);
    await screen.findByText('Chưa có hương linh phù hợp.');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm hương linh' }));
    fireEvent.change(screen.getByLabelText('Mã số'), { target: { value: 'NS-02' } });
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Văn Bình' } });
    fireEvent.click(screen.getByRole('combobox', { name: 'Ngày' }));
    fireEvent.click(await screen.findByRole('option', { name: '10' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Tháng' }));
    fireEvent.click(await screen.findByRole('option', { name: '02' }));
    fireEvent.change(screen.getByLabelText('Người đăng ký'), { target: { value: 'Admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }));
    const drawer = screen.getByRole('dialog', { name: 'Thêm hương linh' });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Đóng thêm hương linh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
    fireEvent.keyDown(drawer, { key: 'Escape' });
    expect(drawer).toBeInTheDocument();

    resolveCreate?.();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thêm hương linh' })).not.toBeInTheDocument());
  });

  it('lets an independent Hương linh gain a household link and register Cầu siêu', async () => {
    people.push({ id: 'spirit-1', code: 'HL-01', fullName: 'HƯƠNG LINH A', dharmaName: 'TÂM AN', dateOfDeath: { day: 1, month: 2, isLeap: true }, createdBy: 'ADMIN', householdReference: '', familyReference: '', prayerHistory: [] });
    render(<DeceasedPersonCatalogPage />);
    await screen.findByText('HƯƠNG LINH A');
    expect(screen.getByText('01/02 ÂL (nhuận)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Liên kết hộ' }));
    fireEvent.change(screen.getByLabelText('Mã hộ'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Mã gia đình'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(repository.updateDeceasedPersonAssociation).toHaveBeenCalledWith(expect.objectContaining({ id: 'spirit-1', householdReference: '12', familyReference: '7' })));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký Cầu siêu' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đăng ký' }));
    await waitFor(() => expect(prayer.createMemorialRegistration).toHaveBeenCalledWith('spirit-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'evening'));
  });
});
