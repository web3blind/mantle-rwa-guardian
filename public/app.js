import { markdownToHtml } from './markdown.js';

const form = document.querySelector('#analyze-form');
const walletInput = document.querySelector('#wallet');
const submitButton = form.querySelector('button[type="submit"]');
const statusEl = document.querySelector('#status');
const resultEl = document.querySelector('#result');
const scoreEl = document.querySelector('#score');
const summaryEl = document.querySelector('#summary');
const positionsEl = document.querySelector('#positions');
const reportEl = document.querySelector('#report');
const publishStatus = document.querySelector('#publish-status');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setStatus(message, variant = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status-banner status-${variant}`;
}

function usd(value) {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function shortHash(value) {
  const text = String(value ?? '');
  if (text.length <= 18) return text;
  return `${text.slice(0, 10)}…${text.slice(-8)}`;
}

function formatBalance(value) {
  const text = String(value ?? '0');
  const number = Number(text);
  if (Number.isFinite(number)) {
    return number.toLocaleString('en-US', {
      maximumFractionDigits: number >= 1000 ? 2 : 4
    });
  }
  const [whole, fraction = ''] = text.split('.');
  return fraction ? `${whole}.${fraction.slice(0, 4)}` : whole;
}

function shortenLongTokens(text) {
  return String(text ?? '').replace(/0x[a-fA-F0-9]{40,64}/g, (value) => shortHash(value));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function timeUntil(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 60_000));
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function cacheWindowText(cache) {
  const remaining = timeUntil(cache?.expiresAt);
  const expires = formatDateTime(cache?.expiresAt);
  const audited = cache?.auditedAt ? `Built ${formatDateTime(cache.auditedAt)}.` : '';
  const ttl = remaining ? `Cache refresh in ${remaining}.` : `Cache expires ${expires}.`;
  return cache?.hit ? `${audited} ${ttl}`.trim() : `Fresh Mantle Sepolia transaction. ${ttl}`;
}

function proofItem(label, value, options = {}) {
  const safeValue = escapeHtml(value);
  const displayValue = options.short ? shortHash(value) : value;
  const valueMarkup = options.href
    ? `<a class="proof-link" href="${escapeHtml(options.href)}" target="_blank" rel="noreferrer" title="${safeValue}">${escapeHtml(displayValue)}</a>`
    : `<code class="proof-code" title="${safeValue}">${escapeHtml(displayValue)}</code>`;

  return `
    <div class="proof-item">
      <span class="proof-label">${escapeHtml(label)}</span>
      <span class="proof-value">${valueMarkup}</span>
      ${options.copy ? `<button class="copy-button" type="button" data-copy="${safeValue}" aria-label="Copy ${escapeHtml(label)}">Copy</button>` : ''}
    </div>
  `;
}

function renderPublication(publication, cache) {
  publishStatus.className = 'proof-panel';
  const cacheTitle = cache?.hit ? 'Cached proof reused' : 'New proof published';
  const cacheText = cacheWindowText(cache);

  publishStatus.innerHTML = `
    <div class="proof-summary">
      <span class="proof-kicker">${escapeHtml(cacheTitle)}</span>
      <span>${escapeHtml(cacheText)}</span>
    </div>
    <div class="proof-grid" aria-label="On-chain proof details">
      ${proofItem('Transaction', publication.txHash, { href: publication.explorerUrl, short: true, copy: true })}
      ${proofItem('Contract', publication.contract, { short: true, copy: true })}
      ${proofItem('Wallet', publication.wallet, { short: true, copy: true })}
      ${proofItem('Portfolio hash', publication.portfolioHash, { short: true, copy: true })}
      ${proofItem('Report hash', publication.reportHash, { short: true, copy: true })}
      ${proofItem('Block', publication.blockNumber)}
      ${proofItem('Assessment count', publication.assessmentCount)}
      ${proofItem('Score', `${publication.riskScore}/100`)}
    </div>
  `;
}

function renderAudit(data) {
  resultEl.hidden = false;
  scoreEl.textContent = `${data.assessment.score}/100`;
  summaryEl.textContent = shortenLongTokens(data.assessment.summary);
  positionsEl.innerHTML = data.snapshot.positions.map((position) => `
    <div class="asset">
      <div class="asset-head">
        <strong>${escapeHtml(position.symbol)}</strong>
        <span>${position.sharePct.toFixed(1)}%</span>
      </div>
      <dl class="asset-metrics">
        <div>
          <dt>Balance</dt>
          <dd title="${escapeHtml(position.balance)}">${escapeHtml(formatBalance(position.balance))}</dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd>${usd(position.valueUsd)}</dd>
        </div>
        <div>
          <dt>Price source</dt>
          <dd>${escapeHtml(position.priceSource)}</dd>
        </div>
      </dl>
    </div>
  `).join('') || '<p>No tracked RWA positions found.</p>';
  reportEl.innerHTML = markdownToHtml(data.report.markdown, { headingOffset: 2 });
  renderPublication(data.publication, data.cache);
}

publishStatus.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy]');
  if (!button) return;
  const value = button.getAttribute('data-copy');
  try {
    await navigator.clipboard.writeText(value);
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy'; }, 1400);
  } catch {
    button.textContent = 'Copy failed';
    setTimeout(() => { button.textContent = 'Copy'; }, 1800);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const wallet = walletInput.value.trim();
  submitButton.disabled = true;
  setStatus('Running AI audit, publishing proof to Mantle Sepolia, then returning the transaction…', 'info');
  publishStatus.textContent = '';
  resultEl.hidden = true;
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wallet })
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Audit failed');
    renderAudit(data);
    const cacheNote = data.cache?.hit ? 'cached proof reused' : 'new proof published';
    setStatus(`Audit complete at Mantle block ${data.snapshot.blockNumber}; ${cacheNote}.`, 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Audit failed', 'error');
  } finally {
    submitButton.disabled = false;
  }
});
