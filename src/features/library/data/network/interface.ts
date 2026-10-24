export interface LibraryBrowserNetworkConfig {
  getAccessToken(): Promise<string>;
  send(path: string, init: RequestInit): Promise<Response>;
}

export interface LibraryBrowserNetwork {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}
