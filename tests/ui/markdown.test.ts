import { describe, expect, it } from 'vitest';
import { markdownToHtml } from '../../public/markdown.js';

describe('markdownToHtml', () => {
  it('renders markdown report headings two levels deeper than the Agent report section', () => {
    const html = markdownToHtml(`# Mantle RWA Guardian report\n\n## Risk drivers\n\nRisk score **68/100**.`, { headingOffset: 2 });

    expect(html).toContain('<h3>Mantle RWA Guardian report</h3>');
    expect(html).toContain('<h4>Risk drivers</h4>');
    expect(html).toContain('<strong>68/100</strong>');
  });

  it('escapes raw HTML while preserving basic markdown structure', () => {
    const html = markdownToHtml(`# Safe\n\n- <script>alert(1)</script>\n- [Proof](https://mantlescan.xyz/tx/0xabc)`, { headingOffset: 2 });

    expect(html).toContain('<h3>Safe</h3>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('<a href="https://mantlescan.xyz/tx/0xabc" target="_blank" rel="noreferrer">Proof</a>');
    expect(html).not.toContain('<script>');
  });
});
