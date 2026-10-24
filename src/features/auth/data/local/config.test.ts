import { describe, expect, it } from 'vitest';
import { authLocalSourceConfig } from './config';

describe('auth local source configuration', () => {
  it('reserves a versioned local boundary without configuring credential storage', () => {
    expect(authLocalSourceConfig).toEqual({ sourceName: 'auth-local', version: 1 });
  });
});
