import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AuditWalletResult } from '../api/auditWallet.js';

export interface AuditCacheEntry {
  wallet: `0x${string}`;
  auditedAt: string;
  expiresAt: string;
  txHash: `0x${string}`;
  result: AuditWalletResult;
}

export interface AuditCacheMetadata {
  hit: boolean;
  ttlSeconds: number;
  auditedAt: string;
  expiresAt: string;
}

const DEFAULT_TTL_SECONDS = 60 * 60;
const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'audit-cache.sqlite');

let db: DatabaseSync | null = null;

export function getAuditCacheTtlSeconds(): number {
  const raw = Number(process.env.AUDIT_CACHE_TTL_SECONDS || DEFAULT_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_TTL_SECONDS;
}

function serializeResult(result: AuditWalletResult): string {
  return JSON.stringify(result, (_key, value) => typeof value === 'bigint' ? value.toString() : value);
}

function openAuditCacheDb(): DatabaseSync {
  if (db) return db;
  const dbPath = process.env.AUDIT_CACHE_DB_PATH || DEFAULT_DB_PATH;
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_cache (
      wallet TEXT PRIMARY KEY,
      audited_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      result_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_cache_expires_at ON audit_cache(expires_at);
  `);
  return db;
}

export function readCachedAudit(wallet: `0x${string}`, now = new Date()): AuditCacheEntry | null {
  const row = openAuditCacheDb().prepare(`
    SELECT wallet, audited_at, expires_at, tx_hash, result_json
    FROM audit_cache
    WHERE wallet = ? AND expires_at > ?
  `).get(wallet, now.toISOString()) as {
    wallet: `0x${string}`;
    audited_at: string;
    expires_at: string;
    tx_hash: `0x${string}`;
    result_json: string;
  } | undefined;

  if (!row) return null;
  return {
    wallet: row.wallet,
    auditedAt: row.audited_at,
    expiresAt: row.expires_at,
    txHash: row.tx_hash,
    result: JSON.parse(row.result_json) as AuditWalletResult
  };
}

export function writeCachedAudit(result: AuditWalletResult, ttlSeconds = getAuditCacheTtlSeconds(), now = new Date()): AuditCacheEntry {
  const auditedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const wallet = result.assessment.wallet;
  const txHash = result.publication.txHash;
  openAuditCacheDb().prepare(`
    INSERT INTO audit_cache (wallet, audited_at, expires_at, tx_hash, result_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(wallet) DO UPDATE SET
      audited_at = excluded.audited_at,
      expires_at = excluded.expires_at,
      tx_hash = excluded.tx_hash,
      result_json = excluded.result_json
  `).run(wallet, auditedAt, expiresAt, txHash, serializeResult(result));

  return { wallet, auditedAt, expiresAt, txHash, result };
}

export function closeAuditCacheForTests(): void {
  db?.close();
  db = null;
}
