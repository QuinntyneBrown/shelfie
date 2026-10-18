import { after } from 'node:test';
import type { Pool } from 'pg';
import { createApp } from './app.ts';
import { createAdminToken, type Scope } from './admin-token.ts';
import { all, get } from './db.ts';
import { seed } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

let database: ReturnType<typeof createTestDatabase> | undefined;
after(async () => (await database)?.drop());

/** The test file's own database, migrated, with the seed restored and no admin tokens or audit rows; dropped when the file ends. */
export async function seededDb(): Promise<Pool> {
  const { pool } = await (database ??= createTestDatabase());
  await seed(pool);
  await pool.query('DELETE FROM admin_token; DELETE FROM admin_audit');
  return pool;
}

export const tokenFor = async (db: Pool, scopes: Scope[] = ['read', 'write']) => (await createAdminToken(db, { name: 'test', scopes })).token;

type Line = Record<string, unknown>;

/** Serves the app on a free port for one request and returns the response with its parsed body and the log lines it wrote. */
export async function call(
  db: Pool,
  method: string,
  path: string,
  { token, body, cookie, app }: { token?: string; body?: unknown; cookie?: string; app?: ReturnType<typeof createApp> } = {},
) {
  const lines: Line[] = [];
  const auditCount = async () => (await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM admin_audit'))!.n;
  const before = await auditCount();
  const server = (app ?? createApp(db, { log: (line) => lines.push(line) })).listen(0);
  try {
    const { port } = server.address() as { port: number };
    const headers: Record<string, string> = {};
    if (token) headers['authorization'] = `Bearer ${token}`;
    if (cookie) headers['cookie'] = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await fetch(`http://localhost:${port}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    // The audit row is written after the response is sent, so wait for it (admin routes write exactly one).
    for (let i = 0; i < 200 && path.startsWith('/api/admin/') && (await auditCount()) === before; i++) await new Promise((resolve) => setTimeout(resolve, 10));
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : undefined, text, lines };
  } finally {
    server.close();
  }
}

export const auditRows = (db: Pool) => all<Record<string, unknown>>(db, 'SELECT * FROM admin_audit ORDER BY id');
