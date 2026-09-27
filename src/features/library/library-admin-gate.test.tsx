import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LibraryAdminGate } from './library-admin-gate';

const { isLibraryAdmin } = vi.hoisted(() => ({ isLibraryAdmin: vi.fn() }));
vi.mock('./library-repository', () => ({ isLibraryAdmin }));

describe('LibraryAdminGate', () => {
  it('does not mount the management page for a non-admin session', async () => {
    isLibraryAdmin.mockResolvedValue(false);
    render(<LibraryAdminGate><h1>Admin screen</h1></LibraryAdminGate>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Tài khoản hiện tại không được cấp quyền quản trị thư viện.');
    expect(screen.queryByRole('heading', { name: 'Admin screen' })).not.toBeInTheDocument();
  });
});
