import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../../public/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../public/styles.css', import.meta.url), 'utf8');

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

describe('audit result UX', () => {
  it('renders proof details as short copyable fields instead of raw overflowing text', () => {
    expect(appJs).toContain('function shortHash');
    expect(appJs).toContain('class="proof-grid"');
    expect(appJs).toContain('class="copy-button"');
    expect(appJs).toContain('data-copy=');
    expect(appJs).toContain('navigator.clipboard.writeText');
    expect(appJs).not.toContain('Published on Mantle Sepolia:<br />');
  });

  it('rounds portfolio balances while preserving raw values in titles', () => {
    expect(appJs).toContain('function formatBalance');
    expect(appJs).toContain('function shortenLongTokens');
    expect(appJs).toContain('summaryEl.textContent = shortenLongTokens(data.assessment.summary)');
    expect(appJs).toContain('class="asset-metrics"');
    expect(appJs).toContain('title="${escapeHtml(position.balance)}"');
  });

  it('styles status, proof and asset rows to prevent horizontal overflow', () => {
    expect(css).toContain('.status-banner');
    expect(css).toContain('.proof-item');
    expect(css).toContain('grid-template-columns: minmax(92px, .7fr) minmax(0, 1fr) auto');
    expect(css).toContain('text-overflow: ellipsis');
    expect(css).toContain('.card {');
    expect(css).toContain('overflow: hidden;');
  });
});
