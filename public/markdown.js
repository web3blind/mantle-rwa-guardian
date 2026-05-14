const INLINE_CODE_PLACEHOLDER = '%%INLINE_CODE_';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeLinkHref(value) {
  try {
    const origin = globalThis.location?.origin || 'https://mantleguardian.xyz';
    const url = new URL(value, origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    // Fall through to a harmless empty href.
  }
  return '';
}

function renderInlineMarkdown(value) {
  const codeSpans = [];
  let text = String(value).replace(/`([^`]+)`/g, (_match, code) => {
    const index = codeSpans.push(`<code>${escapeHtml(code)}</code>`) - 1;
    return `${INLINE_CODE_PLACEHOLDER}${index}%%`;
  });

  text = escapeHtml(text);
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, href) => {
    const safeHref = safeLinkHref(href);
    if (!safeHref) return label;
    return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer">${label}</a>`;
  });
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');

  return text.replace(new RegExp(`${INLINE_CODE_PLACEHOLDER}(\\d+)%%`, 'g'), (_match, index) => codeSpans[Number(index)] || '');
}

function flushList(html, listItems) {
  if (!listItems.length) return;
  html.push('<ul>');
  for (const item of listItems) html.push(`<li>${renderInlineMarkdown(item)}</li>`);
  html.push('</ul>');
  listItems.length = 0;
}

export function markdownToHtml(markdown, options = {}) {
  const headingOffset = Number.isInteger(options.headingOffset) ? options.headingOffset : 2;
  const html = [];
  const listItems = [];
  let paragraph = [];
  let inCodeBlock = false;
  let codeBlock = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushCodeBlock() {
    html.push(`<pre><code>${escapeHtml(codeBlock.join('\n'))}</code></pre>`);
    codeBlock = [];
  }

  for (const line of String(markdown || '').replace(/\r\n/g, '\n').split('\n')) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList(html, listItems);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlock.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList(html, listItems);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList(html, listItems);
      const level = Math.min(6, heading[1].length + headingOffset);
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = trimmed.match(/^[-*+]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
      continue;
    }

    flushList(html, listItems);
    paragraph.push(trimmed);
  }

  if (inCodeBlock) flushCodeBlock();
  flushParagraph();
  flushList(html, listItems);

  return html.join('\n');
}
