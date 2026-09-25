import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HouseholdWorkspace } from '../features/households/household-workspace';
import OverviewPage from './(dashboard)/overview/page';

describe('App Router pages', () => {
  it('renders the household workspace', () => {
    render(<HouseholdWorkspace />);

    expect(screen.getByRole('heading', { name: 'Quản lý hộ khẩu' })).toBeVisible();
  });

  it('asks for confirmation before discarding a household draft', async () => {
    const user = userEvent.setup();
    render(<HouseholdWorkspace />);

    await user.type(screen.getByRole('textbox', { name: 'Địa chỉ gia đình' }), '12 Lê Lợi');
    await user.click(screen.getByRole('button', { name: 'Thêm gia đình' }));
    await user.click(screen.getByRole('button', { name: 'Đóng và bỏ bản nháp' }));

    expect(screen.getByRole('dialog', { name: 'Bỏ bản nháp' })).toBeVisible();
  });

  it('renders the overview page', () => {
    render(<OverviewPage />);

    expect(screen.getByRole('heading', { name: 'Không gian quản trị lễ' })).toBeVisible();
  });
});
