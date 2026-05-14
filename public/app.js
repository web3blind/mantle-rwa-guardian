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

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'error' : '';
}

function usd(value) {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function renderPublication(publication, cache) {
  publishStatus.className = '';
  const cacheLine = cache?.hit
    ? `Cached audit: reused previous on-chain proof from ${cache.auditedAt}. Cache expires: ${cache.expiresAt}.<br />`
    : `New on-chain proof published. Cache expires: ${cache.expiresAt}.<br />`;
  publishStatus.innerHTML = `
    ${cacheLine}
    Published on Mantle Sepolia:<br />
    <a href="${publication.explorerUrl}" target="_blank" rel="noreferrer">${publication.txHash}</a><br />
    Contract: ${publication.contract}<br />
    Block: ${publication.blockNumber}<br />
    Assessment count: ${publication.assessmentCount}<br />
    Wallet: ${publication.wallet}<br />
    Score: ${publication.riskScore}/100<br />
    Portfolio hash: ${publication.portfolioHash}<br />
    Report hash: ${publication.reportHash}
  `;
}

function renderAudit(data) {
  resultEl.hidden = false;
  scoreEl.textContent = `${data.assessment.score}/100`;
  summaryEl.textContent = data.assessment.summary;
  positionsEl.innerHTML = data.snapshot.positions.map((position) => `
    <div class="asset">
      <strong>${position.symbol}</strong><br />
      Balance: ${position.balance}<br />
      Value: ${usd(position.valueUsd)} (${position.sharePct.toFixed(1)}%)<br />
      Price source: ${position.priceSource}
    </div>
  `).join('') || '<p>No tracked RWA positions found.</p>';
  const reportMarkdown = `${data.report.markdown}\n\n---\nAgent model: ${data.report.model} (${data.report.source})`;
  reportEl.innerHTML = markdownToHtml(reportMarkdown, { headingOffset: 2 });
  renderPublication(data.publication, data.cache);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const wallet = walletInput.value.trim();
  submitButton.disabled = true;
  setStatus('Running AI audit, publishing proof to Mantle Sepolia, then returning the transaction…');
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
    setStatus(`Audit complete at Mantle block ${data.snapshot.blockNumber}; ${cacheNote} in tx ${data.publication.txHash}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Audit failed', true);
  } finally {
    submitButton.disabled = false;
  }
});
