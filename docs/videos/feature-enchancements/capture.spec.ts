import { test } from '@playwright/test';
import express from 'express';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../../../apps/api/src/app.ts';
import { seed } from '../../../apps/api/src/seed.ts';
import { createTestDatabase } from '../../../apps/api/src/test-db.ts';
import { useDatabase } from '../../../e2e/support/database';
import { fakeAssistant, assistantNotSetUp } from '../../../e2e/support/assistant';
import { deliver } from '../../../e2e/support/mailbox';
import { AddBookPage } from '../../../e2e/pages/add-book.page';
import { ManageBookPage } from '../../../e2e/pages/manage-book.page';
import { ReviewChapterPage } from '../../../e2e/pages/review-chapter.page';
import { SignInPage } from '../../../e2e/pages/sign-in.page';
import { BooksPage } from '../../../e2e/pages/books.page';
import { coverFixture } from '../../../e2e/support/covers';
import { DAD, NIA } from '../../../e2e/support/accounts';

const OUT = process.env.VIDEO_OUT!;
const scenes: { id: string; dur: number }[] = JSON.parse(readFileSync(join(OUT, 'scenes.json'), 'utf8'));
const dur = (id: string) => scenes.find((s) => s.id === id)!.dur * 1000;
const WEB = join(import.meta.dirname, '../../../apps/web/dist/shelfie/browser');
const SIZE = { width: 1600, height: 900 };

test('capture the feature enhancements', async () => {
  test.setTimeout(600_000);
  const db = await createTestDatabase();
  useDatabase(db.pool);
  await seed(db.pool, { books: true });
  const app = express();
  app.use(createApp(db.pool, { log: () => {}, mail: deliver, assistant: fakeAssistant }));
  app.use(express.static(WEB));
  app.use((_req, res) => res.sendFile(join(WEB, 'index.html')));
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const url = `http://localhost:${(server.address() as any).port}`;
  process.env.APP_URL = url;

  const browser = await chromium.launch();
  const CURSOR = `addEventListener('DOMContentLoaded',()=>{const d=document.createElement('div');d.style.cssText='position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(255,80,80,.55);border:2px solid #fff;pointer-events:none;left:-50px;top:0';document.body.append(d);addEventListener('mousemove',e=>{d.style.left=e.clientX+'px';d.style.top=e.clientY+'px'},true)})`;

  async function login(who: { username: string; password: string }, landing: string) {
    const ctx = await browser.newContext({ baseURL: url, viewport: SIZE });
    const page = await ctx.newPage();
    const si = new SignInPage(page);
    await si.open();
    await si.signInWithPassword(who.username, who.password);
    await page.waitForURL(landing);
    const state = await ctx.storageState();
    await ctx.close();
    return state;
  }
  const nia = await login(NIA, '**/shelf');
  const dad = await login(DAD, '**/review');

  async function scene(id: string, state: any, run: (page: any) => Promise<void>) {
    const ctx = await browser.newContext({ baseURL: url, viewport: SIZE, storageState: state, recordVideo: { dir: join(OUT, 'raw'), size: SIZE } });
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

  await scene('intro', nia, async (p) => {
    await p.goto('/shelf');
    await pause(p, 3000);
    await p.mouse.move(800, 450, { steps: 25 });
  });

  await scene('add', nia, async (p) => {
    const add = new AddBookPage(p);
    await add.open();
    await pause(p);
    await add.titleField().pressSequentially('The Hobbit', { delay: 70 });
    await add.authorField().pressSequentially('J. R. R. Tolkien', { delay: 40 });
    await add.chaptersField().fill('19');
    await p.getByRole('radio', { name: 'Peach', exact: true }).check({ force: true });
    await p.getByRole('radio', { name: 'Dragon', exact: true }).check({ force: true });
    await pause(p);
    await add.choosePicture(coverFixture());
    await pause(p, 1500);
    await add.submit();
    await pause(p, 1500);
  });

  await scene('shelf', nia, async (p) => {
    await p.goto('/shelf');
    await pause(p, 1500);
    await p.getByText('The Hobbit').first().hover();
  });

  await scene('manage', dad, async (p) => {
    const books = new BooksPage(p);
    await books.open();
    await pause(p, 1200);
    await books.manage('The Hobbit');
    await pause(p, 1200);
    const manage = new ManageBookPage(p);
    await manage.choosePicture(coverFixture('lion-cover.jpg'));
    await pause(p, 2000);
  });

  await scene('assist', dad, async (p) => {
    const review = new ReviewChapterPage(p);
    await review.open('b-lion-c11');
    await pause(p, 2500);
    await review.helpButton().click();
    await pause(p, 2000);
  });

  await scene('draft', dad, async (p) => {
    const review = new ReviewChapterPage(p);
    await review.open('b-lion-c11');
    await pause(p, 800);
    await review.askForHelp();
    await pause(p, 2000);
    await review.useDraft();
    await pause(p);
    await review.noteField().pressSequentially(' Love, Dad', { delay: 80 });
    await review.pickSticker('Wise owl');
    await pause(p);
    await review.send();
  });

  assistantNotSetUp();
  await scene('outro', dad, async (p) => {
    const review = new ReviewChapterPage(p);
    await review.open('b-lion-c10');
    await pause(p, 1000);
    await review.askForHelp();
    await pause(p, 2500);
    await review.pickSticker('Rocket');
  });

  await browser.close();
  server.closeAllConnections();
  server.close();
  await db.drop();
});
