import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeReleaseId, writeBuildInfo } from './library-function-release-id.mjs';
import { verifyRelease } from './verify-library-function-release.mjs';

test('release fingerprint detects deployable/config/lock changes and excludes generated info/tests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'library-release-'));
  try {
    const dir = join(root, 'supabase/functions/library-lifecycle');
    await mkdir(dir, { recursive: true });
    const config = join(root, 'supabase/config.toml');
    await writeFile(config, 'project_id="test"\n[functions.library-lifecycle]\nverify_jwt=false\n');
    for (const name of ['index.ts', 'deno.json', 'deno.lock']) await writeFile(join(dir, name), name);
    const initial = await computeReleaseId(root);
    assert.equal(await computeReleaseId(root), initial);
    assert.equal(await writeBuildInfo(root), initial);
    assert.match(await readFile(join(dir, 'build-info.ts'), 'utf8'), new RegExp(initial));
    await writeFile(join(dir, 'security.test.ts'), 'test change');
    assert.equal(await computeReleaseId(root), initial);
    for (const name of ['index.ts', 'deno.json', 'deno.lock']) {
      await writeFile(join(dir, name), `${name} changed`);
      assert.notEqual(await computeReleaseId(root), initial);
      await writeFile(join(dir, name), name);
    }
    await writeFile(config, 'project_id="other"\n[functions.library-lifecycle]\nverify_jwt=false\n');
    assert.equal(await computeReleaseId(root), initial);
    await writeFile(config, '[functions.library-lifecycle]\nverify_jwt=true\n');
    assert.notEqual(await computeReleaseId(root), initial);
    await rm(join(dir, 'deno.lock'));
    await assert.rejects(computeReleaseId(root), /Missing function artifact/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

const expected = `sha256:${'a'.repeat(64)}`;
const url = 'https://test.supabase.co/functions/v1/library-lifecycle/health';
test('read-only release gate succeeds only on exact version and artifact', async () => {
  let calls = 0;
  await verifyRelease({ url, expected, fetchImpl: async (target, options) => {
    calls++;
    assert.equal(String(target), url);
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.body, undefined);
    assert.equal(options.headers.authorization, undefined);
    return Response.json({ contractVersion: 1, releaseId: expected });
  } });
  assert.equal(calls, 1);
  for (const body of [{}, { contractVersion: 2, releaseId: expected }, { contractVersion: 1, releaseId: `sha256:${'b'.repeat(64)}` }]) {
    await assert.rejects(verifyRelease({ url, expected, fetchImpl: async () => Response.json(body) }), /does not match/);
  }
  await assert.rejects(verifyRelease({ url, expected, fetchImpl: async () => new Response(null, { status: 503 }) }), /503/);
  await assert.rejects(verifyRelease({ url, expected, fetchImpl: async () => { throw new Error('unreachable'); } }), /unreachable/);
  await assert.rejects(verifyRelease({ url, expected, fetchImpl: async () => new Response('bad json') }));
  await assert.rejects(verifyRelease({ url: 'http://remote.test/functions/v1/library-lifecycle/health', expected }), /HTTPS/);
});
