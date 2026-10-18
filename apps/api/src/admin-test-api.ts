import { after } from 'node:test';
import type { Pool } from 'pg';
import { createApp } from './app.ts';
import { createAdminToken, type Scope } from './admin-token.ts';
import { all } from './db.ts';
import { seed } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const databases: Awaited<ReturnType<typeof createTestDatabase>>[] = [];
after(() => Promise.all(databases.map((database) => database.drop())));

/** A database of its own, migrated and seeded, for one admin API test; dropped when the test file ends. */
export async function seededDb(): Promise<Pool> {
  const database = await createTestDatabase();
  databases.push(database);
  await seed(database.pool);
  return database.pool;
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
  const server = (app ?? createApp(db, { log: (line) => lines.push(line) })).listen(0);
  try {
    const { port } = server.address() as { port: number };
    const headers: Record<string, string> = {};
    if (token) headers['authorization'] = `Bearer ${token}`;
    if (cookie) headers['cookie'] = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await fetch(`http://localhost:${port}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : undefined, text, lines };
  } finally {
    server.close();
  }
}

export const auditRows = (db: Pool) => all<Record<string, unknown>>(db, 'SELECT * FROM admin_audit ORDER BY id');
