import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('./auth-repository', () => ({ authRepository: { configurationError: null, signIn: mocks.signIn } }));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signIn.mockResolvedValue(true);
  });

  it('submits the internal auth alias through the auth repository', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByRole('textbox', { name: 'Tài khoản' }), 'Admin');
    await user.type(screen.getByLabelText('Mật khẩu'), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith({
      email: 'admin@ss-lotus.local',
      password: 'test-password',
    }));
    expect(mocks.replace).toHaveBeenCalledWith('/households');
  });

  it('rejects an invalid username before it calls the auth repository', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByRole('textbox', { name: 'Tài khoản' }), 'a@b');
    await user.type(screen.getByLabelText('Mật khẩu'), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Tài khoản phải có từ 3 đến 32 ký tự');
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
