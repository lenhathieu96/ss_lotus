import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { computeReleaseId, contractVersion } from './library-function-release-id.mjs';

export async function verifyRelease({ url, expected, timeoutMs = 10000, fetchImpl = fetch }) {
  const target = new URL(url);
  if (target.protocol !== 'https:' && !(target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))) throw new Error('Health URL must use HTTPS (or local HTTP).');
  if (target.username || target.password || target.search || target.hash) throw new Error('Health URL must not contain credentials, query or fragment.');
  if (!target.pathname.endsWith('/functions/v1/library-lifecycle/health')) throw new Error('Expected library-lifecycle health URL.');
  if (!/^sha256:[a-f0-9]{64}$/.test(expected)) throw new Error('Invalid expected release ID.');
  const response = await fetchImpl(target, { method: 'GET', headers: { accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Function health returned HTTP ${response.status}.`);
  const body = await response.json();
  if (body?.contractVersion !== contractVersion || body?.releaseId !== expected) throw new Error('Function release does not match this frontend checkout.');
  return { contractVersion, releaseId: expected };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const values = {};
    while (args.length) {
      const name = args.shift();
      if (!['--url', '--expected'].includes(name) || !args[0] || args[0].startsWith('--') || values[name]) throw new Error('Usage: verify-library-function-release.mjs --url <health-url> [--expected <sha256:id>]');
      values[name] = args.shift();
    }
    if (!values['--url']) throw new Error('Missing --url.');
    await verifyRelease({ url: values['--url'], expected: values['--expected'] ?? await computeReleaseId() });
    console.log('Library Function release verified.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
