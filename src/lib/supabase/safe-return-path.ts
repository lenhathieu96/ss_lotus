const unsafePathPrefix = /^\/(?:\/|\\|%2f|%5c)/i;

/** Accept only a same-origin path with exactly one leading slash. */
export function isSafeReturnPath(value: string | null | undefined): value is string {
  return typeof value === 'string'
    && value.startsWith('/')
    && !unsafePathPrefix.test(value)
    && !/[\\\u0000-\u001f]/.test(value);
}

export function safeReturnPath(value: string | null | undefined, fallback = '/households'): string {
  return isSafeReturnPath(value) ? value : fallback;
}
