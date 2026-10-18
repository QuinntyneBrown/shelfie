import { test } from '@playwright/test';
import express from 'express';
import { chromium } from 'playwright';
import { readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../../../apps/api/src/app.ts';
import { seed } from '../../../apps/api/src/seed.ts';
import { createTestDatabase } from '../../../apps/api/src/test-db.ts';
import { useDatabase } from '../../../e2e/support/database';
import { fakeAssistant } from '../../../e2e/support/assistant';
import { suggest } from '../../../e2e/support/suggestions';
import { deliver } from '../../../e2e/support/mailbox';
import { BooksPage } from '../../../e2e/pages/books.page';
import { ManageBookPage } from '../../../e2e/pages/manage-book.page';
import { SignInPage } from '../../../e2e/pages/sign-in.page';
import { SuggestQuestionsDialog } from '../../../e2e/pages/suggest-questions-dialog.page';
import { DAD } from '../../../e2e/support/accounts';

const OUT = process.env.VIDEO_OUT!;
const scenes: { id: string; dur: number }[] = JSON.parse(readFileSync(join(OUT, 'scenes.json'), 'utf8'));
const dur = (id: string) => scenes.find((s) => s.id === id)!.dur * 1000;
const WEB = join(import.meta.dirname, '../../../apps/web/dist/shelfie/browser');
const SIZE = { width: 1600, height: 900 };
const CURSOR = `addEventListener('DOMContentLoaded',()=>{const d=document.createElement('div');d.style.cssText='position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(255,80,80,.55);border:2px solid #fff;pointer-events:none;left:-50px;top:0';document.body.append(d);addEventListener('mousemove',e=>{d.style.left=e.clientX+'px';d.style.top=e.clientY+'px'},true)})`;

test('capture suggested questions', async () => {
  test.setTimeout(600_000);
  const db = await createTestDatabase();
  useDatabase(db.pool);
  await seed(db.pool, { books: true });
  const app = express();
  app.use(createApp(db.pool, { log: () => {}, mail: deliver, assistant: fakeAssistant, suggest }));
  app.use(express.static(WEB));
  app.use((_req, res) => res.sendFile(join(WEB, 'index.html')));
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const url = `http://localhost:${(server.address() as any).port}`;
  process.env.APP_URL = url;
  const browser = await chromium.launch();

  const login = await browser.newContext({ baseURL: url, viewport: SIZE });
  const lp = await login.newPage();
  const si = new SignInPage(lp);
  await si.open();
  await si.signInWithPassword(DAD.username, DAD.password);
  await lp.waitForURL('**/review');
  const dad = await login.storageState();
  await login.close();

  async function scene(id: string, run: (page: any) => Promise<void>) {
    const ctx = await browser.newContext({ baseURL: url, viewport: SIZE, storageState: dad, recordVideo: { dir: join(OUT, 'raw'), size: SIZE } });
    await ctx.addInitScript(CURSOR);
    const page = await ctx.newPage();
    const t0 = Date.now();
    await run(page);
    await page.waitForTimeout(Math.max(0, dur(id) + 900 - (Date.now() - t0)));
    const video = page.video()!;
    await ctx.close();
    renameSync(await video.path(), join(OUT, `${id}.webm`));
    console.log('scene', id, ((Date.now() - t0) / 1000).toFixed(1));
  }
  const pause = (p: any, ms = 900) => p.waitForTimeout(ms);
  const openLion = async (p: any) => {
    const books = new BooksPage(p);
    await books.open();
    await pause(p, 1000);
    await books.manage('The Lion, the Witch and the Wardrobe');
    await pause(p, 1200);
  };

  await scene('intro', async (p) => {
    await openLion(p);
    await new ManageBookPage(p).suggestQuestions();
    await pause(p, 1500);
  });

  await scene('ideas', async (p) => {
    await openLion(p);
    await new ManageBookPage(p).suggestQuestions();
    await pause(p, 3500);
  });

  await scene('add', async (p) => {
    await openLion(p);
    await new ManageBookPage(p).suggestQuestions();
    const dialog = new SuggestQuestionsDialog(p);
    await pause(p, 1500);
    await dialog.keep(2, 4);
    await pause(p);
    await dialog.wording(2).click();
    await dialog.reword(2, 'How did Edmund feel when he got to the Witch’s house?');
    await pause(p, 1200);
    await dialog.add();
    await pause(p, 2500);
  });

  await scene('unavailable', async (p) => {
    const dialog = new SuggestQuestionsDialog(p);
    await dialog.switchOffSuggestions();
    await openLion(p);
    await new ManageBookPage(p).suggestQuestions();
    await pause(p, 2500);
  });

  await browser.close();
  server.closeAllConnections();
  server.close();
  await db.drop();
});
