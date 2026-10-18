import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { all, openDb, run, type Db } from './db.ts';

export type Scope = 'read' | 'write';

export interface AdminTokenView {
  id: string;
  name: string;
  scopes: Scope[];
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

const DEFAULT_DAYS = 30;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Stores a new token's hash and returns the token, which is never stored or shown again. */
export async function createAdminToken(db: Db, { name, scopes, days = DEFAULT_DAYS }: { name: string; scopes: Scope[]; days?: number }) {
  const id = `tok_${randomBytes(4).toString('hex')}`;
  const token = `shfa_${randomBytes(32).toString('base64url')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  await run(db, 'INSERT INTO admin_token (id, name, token_hash, scopes, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)', [
    id,
    name,
    hashToken(token),
    scopes.join(' '),
    now.toISOString(),
    expiresAt,
  ]);
  return { id, token, expiresAt };
}

export async function listAdminTokens(db: Db): Promise<AdminTokenView[]> {
  const rows = await all<{ id: string; name: string; scopes: string; expires_at: string; last_used_at: string | null; revoked_at: string | null }>(db, 'SELECT id, name, scopes, expires_at, last_used_at, revoked_at FROM admin_token ORDER BY created_at');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    scopes: r.scopes.split(' ') as Scope[],
    expiresAt: r.expires_at,
    lastUsedAt: r.last_used_at,
    revokedAt: r.revoked_at,
  }));
}

/** False when no token has this id. */
export async function revokeAdminToken(db: Db, id: string): Promise<boolean> {
  return (await run(db, 'UPDATE admin_token SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL', [new Date().toISOString(), id])) === 1;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(args: string[]) {
  const url = process.env.DATABASE_URL;
  if (!url) fail('DATABASE_URL is not set');
  const db = openDb(url);
  try {
    await runCommand(db, args);
  } finally {
    await db.end();
  }
}

async function runCommand(db: Db, args: string[]) {
  const [command, ...rest] = args;
  if (command === 'create') {
    const { values } = parseArgs({ args: rest, options: { name: { type: 'string' }, scopes: { type: 'string' }, days: { type: 'string' } } });
    const name = values.name?.trim() ?? '';
    if (name.length < 1 || name.length > 40) fail('--name must be 1 to 40 characters');
    if (values.scopes !== 'read' && values.scopes !== 'read,write') fail('--scopes must be read or read,write');
    const days = values.days === undefined ? DEFAULT_DAYS : Number(values.days);
    if (!Number.isInteger(days) || days < 1 || days > 90) fail('--days must be a whole number from 1 to 90');
    const { id, token, expiresAt } = await createAdminToken(db, { name, scopes: values.scopes.split(',') as Scope[], days });
    console.log(`Created ${id} (${name}), expires ${expiresAt}. This is the only time the token is shown:\n\n${token}\n`);
  } else if (command === 'list') {
    for (const t of await listAdminTokens(db)) {
      const state = t.revokedAt ? `revoked ${t.revokedAt}` : `last used ${t.lastUsedAt ?? 'never'}`;
      console.log(`${t.id}  ${t.name}  ${t.scopes.join(',')}  expires ${t.expiresAt}  ${state}`);
    }
  } else if (command === 'revoke') {
    if (!rest[0] || !(await revokeAdminToken(db, rest[0]))) fail(`No active token ${rest[0] ?? ''}`);
    console.log(`Revoked ${rest[0]}`);
  } else {
    fail('Usage: admin-token create --name <name> --scopes read|read,write [--days 1-90] | list | revoke <id>');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await main(process.argv.slice(2));
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
}
