import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../../public/app.js', import.meta.url), 'utf8');

describe('public page chrome', () => {
  it('credits the blind developer and links to the public profiles/source', () => {
    expect(html).toContain('Created by <a href="https://blinddev.xyz/en"');
    expect(html).toContain('X @denis_skripnik');
    expect(html).toContain('https://x.com/denis_skripnik');
    expect(html).toContain('source code on GitHub');
    expect(html).toContain('https://github.com/web3blind/mantle-rwa-guardian');
  });

  it('does not append internal model diagnostics to the public report', () => {
    expect(appJs).not.toContain('Agent model:');
    expect(appJs).not.toContain('deterministic-fallback');
  });
});
