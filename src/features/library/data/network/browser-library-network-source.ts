import type { LibraryBrowserNetwork, LibraryBrowserNetworkConfig } from './interface';

/** Sends authenticated, same-origin library requests from the browser. */
export function createBrowserLibraryNetworkSource(config: LibraryBrowserNetworkConfig): LibraryBrowserNetwork {
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const response = await config.send(path, {
        ...init,
        headers: {
          authorization: `Bearer ${await config.getAccessToken()}`,
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...init.headers,
        },
      });
      const body = await response.json().catch(() => ({})) as { error?: string } & T;
      if (!response.ok) throw new Error(body.error ?? 'Không thể xử lý yêu cầu thư viện.');
      return body;
    },
  };
}
