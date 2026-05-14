import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { analyzeWallet } from './api/analyzeWallet.js';
import { auditWallet } from './api/auditWallet.js';
import { publishAssessment } from './api/publishAssessment.js';

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = join(process.cwd(), 'public');

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  response.end(JSON.stringify(payload, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
}

function sendText(response: ServerResponse, status: number, text: string, contentType = 'text/plain; charset=utf-8'): void {
  response.writeHead(status, { 'content-type': contentType });
  response.end(text);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error('request body too large'));
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function serveStatic(pathname: string, response: ServerResponse): Promise<void> {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = normalize(requested).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendText(response, 403, 'Forbidden');
  try {
    const content = await readFile(filePath);
    const type = extname(filePath) === '.js' ? 'text/javascript; charset=utf-8'
      : extname(filePath) === '.css' ? 'text/css; charset=utf-8'
        : 'text/html; charset=utf-8';
    response.writeHead(200, { 'content-type': type });
    response.end(content);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!request.url) return sendText(response, 400, 'Missing URL');
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' });
    response.end();
    return;
  }
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/health') return sendJson(response, 200, { ok: true, service: 'mantle-rwa-guardian' });
    if (url.pathname === '/api/analyze' && request.method === 'GET') {
      const wallet = url.searchParams.get('wallet');
      if (!wallet) return sendJson(response, 400, { error: 'wallet query parameter is required' });
      return sendJson(response, 200, await analyzeWallet(wallet));
    }
    if (url.pathname === '/api/audit' && request.method === 'POST') {
      const payload = JSON.parse(await readBody(request));
      if (!payload.wallet) return sendJson(response, 400, { error: 'wallet is required' });
      return sendJson(response, 200, await auditWallet(payload.wallet));
    }
    if (url.pathname === '/api/publish' && request.method === 'POST') {
      const payload = JSON.parse(await readBody(request));
      return sendJson(response, 200, await publishAssessment(payload));
    }
    if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { error: 'API route not found' });
    return serveStatic(url.pathname, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return sendJson(response, 500, { error: message });
  }
}

export function createGuardianServer() {
  return createServer((request, response) => { void handle(request, response); });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createGuardianServer().listen(PORT, () => {
    console.log(`Mantle RWA Guardian listening on http://localhost:${PORT}`);
  });
}
