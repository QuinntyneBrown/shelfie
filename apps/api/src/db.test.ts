// Traces to: L2-037, L2-038
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { all, get, migrate } from './db.ts';
import { createTestDatabase } from './test-db.ts';

const applied = (pool: Parameters<typeof migrate>[0]) => all<{ name: string }>(pool, 'SELECT name FROM schema_migration ORDER BY name');

test('Given an empty database, when the API migrates, then every migration is applied in order, recorded, and the tables exist', async () => {
  const db = await createTestDatabase({ migrated: false });
  try {
    await migrate(db.pool);

    assert.deepEqual((await applied(db.pool)).map((m) => m.name), ['001-initial.sql', '002-profile-photo.sql', '003-book-cover.sql', '004-admin.sql', '005-reward-gallery.sql', '006-streak-reward.sql', '007-reward-pictures.sql', '008-streak-reward-amount.sql', '009-feedback.sql', '010-push.sql', '011-directory.sql']);
    await db.pool.query("INSERT INTO household (id) VALUES ('h1')");
    const row = await get<{ theme: string; count: number }>(db.pool, "SELECT theme, (SELECT COUNT(*) FROM household) AS count FROM household WHERE id = 'h1'");
    assert.deepEqual(row, { theme: 'device', count: 1 });
  } finally {
    await db.drop();
  }
});

test('Given a migrated database, when the API migrates again, then nothing runs twice and the data is kept', async () => {
  const db = await createTestDatabase();
  try {
    await db.pool.query("INSERT INTO household (id) VALUES ('h1')");

    await migrate(db.pool);

    assert.equal((await applied(db.pool)).length, 11);
    assert.equal((await get<{ id: string }>(db.pool, 'SELECT id FROM household'))?.id, 'h1');
  } finally {
    await db.drop();
  }
});

test('Given a migration that fails, then it is rolled back, not recorded, the error names it and the earlier one stays applied', async () => {
  const db = await createTestDatabase({ migrated: false });
  const dir = mkdtempSync(join(tmpdir(), 'shelfie-migrations-'));
  writeFileSync(join(dir, '001-good.sql'), 'CREATE TABLE good (id TEXT PRIMARY KEY)');
  writeFileSync(join(dir, '002-bad.sql'), 'CREATE TABLE half (id TEXT PRIMARY KEY); SELECT 1 / 0');
  try {
    await assert.rejects(migrate(db.pool, pathToFileURL(`${dir}/`)), /002-bad\.sql/);

    assert.deepEqual((await applied(db.pool)).map((m) => m.name), ['001-good.sql']);
    const tables = await all<{ name: string }>(db.pool, "SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY 1");
    assert.deepEqual(tables.map((t) => t.name), ['good', 'schema_migration']);
  } finally {
    await db.drop();
  }
});

test('Given two API processes starting together, when both migrate, then each migration is applied exactly once', async () => {
  const db = await createTestDatabase({ migrated: false });
  try {
    await Promise.all([migrate(db.pool), migrate(db.pool), migrate(db.pool)]);

    assert.deepEqual((await applied(db.pool)).map((m) => m.name), ['001-initial.sql', '002-profile-photo.sql', '003-book-cover.sql', '004-admin.sql', '005-reward-gallery.sql', '006-streak-reward.sql', '007-reward-pictures.sql', '008-streak-reward-amount.sql', '009-feedback.sql', '010-push.sql', '011-directory.sql']);
  } finally {
    await db.drop();
  }
});
