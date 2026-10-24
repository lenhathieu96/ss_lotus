import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryDownloadButton } from './library-download-button';

const { getLibraryDownloadUrl, assign } = vi.hoisted(() => ({ getLibraryDownloadUrl: vi.fn(), assign: vi.fn() }));
vi.mock('../library-repository', () => ({ getLibraryDownloadUrl }));

describe('LibraryDownloadButton', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', { assign });
  });

  it('prevents duplicate requests while pending and obtains a fresh URL on every click', async () => {
    let resolve!: (url: string) => void;
    getLibraryDownloadUrl.mockReturnValueOnce(new Promise<string>((done) => { resolve = done; })).mockResolvedValueOnce('https://signed.test/new');
    render(<LibraryDownloadButton documentId="doc-1" />);
    const button = screen.getByRole('button', { name: 'Tải PDF' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(getLibraryDownloadUrl).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolve('https://signed.test/first'));
    expect(assign).toHaveBeenCalledWith('https://signed.test/first');
    fireEvent.click(screen.getByRole('button', { name: 'Tải PDF' }));
    await waitFor(() => expect(assign).toHaveBeenLastCalledWith('https://signed.test/new'));
    expect(getLibraryDownloadUrl).toHaveBeenCalledTimes(2);
  });

  it('shows a retryable error and retries the lookup', async () => {
    getLibraryDownloadUrl.mockRejectedValueOnce(new Error('Không thể kết nối')).mockResolvedValueOnce('https://signed.test/retry');
    render(<LibraryDownloadButton documentId="doc-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Tải PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối');
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải PDF lại' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://signed.test/retry'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
