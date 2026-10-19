import { chromium } from '@playwright/test';
import fs from 'node:fs';

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const report = {};

async function visit(name, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await page.waitForTimeout(1500);
  // dismiss cookie banners if present
  for (const t of ['Accept', 'Accept All', 'Got it', 'I agree']) {
    const b = page.getByRole('button', { name: t, exact: false }).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  await page.screenshot({ path: `${out}/${name}-desktop.png`, fullPage: true });
  const info = await page.evaluate(() => {
    const txt = (sel) => [...document.querySelectorAll(sel)].map(e => e.innerText.trim()).filter(Boolean);
    const fonts = new Set(), colors = new Set(), bgs = new Set(), radii = new Set();
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      fonts.add(cs.fontFamily.split(',')[0].replace(/"/g, ''));
      if (cs.color) colors.add(cs.color);
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs.add(cs.backgroundColor);
      if (cs.borderRadius && cs.borderRadius !== '0px') radii.add(cs.borderRadius);
    }
    return {
      title: document.title,
      h1: txt('h1'), h2: txt('h2'), h3: txt('h3').slice(0, 40),
      buttons: [...new Set(txt('a[class*=btn], a[class*=button], button, .button'))].slice(0, 40),
      nav: [...new Set(txt('nav a, header a'))].slice(0, 60),
      links: [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)))].slice(0, 120),
      fonts: [...fonts], colors: [...colors].slice(0, 40), bgs: [...bgs].slice(0, 40), radii: [...radii].slice(0, 20),
      images: document.images.length,
      bodyText: document.body.innerText.slice(0, 6000),
    };
  });
  report[name] = { url, ...info };
}

await visit('home', 'https://www.beanstack.com/');
const links = report.home.links;
fs.writeFileSync(`${out}/home-links.json`, JSON.stringify(links, null, 2));
const picks = links.filter(l => !/#|mailto|login|sign/.test(l) && l !== 'https://www.beanstack.com/').slice(0, 10);
let i = 0;
for (const l of picks) { await visit(`page${i++}-${l.replace(/https?:\/\/www\.beanstack\.com\/?/, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'root'}`, l); }

// mobile home
const mctx = await browser.newContext({ ...{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
const mp = await mctx.newPage();
await mp.goto('https://www.beanstack.com/', { waitUntil: 'domcontentloaded' });
await mp.waitForTimeout(2000);
await mp.screenshot({ path: `${out}/home-mobile.png`, fullPage: true });
const burger = mp.locator('button[aria-label*=menu i], [class*=hamburger], [class*=menu-toggle], button:has(svg)').first();
if (await burger.isVisible().catch(() => false)) { await burger.click().catch(() => {}); await mp.waitForTimeout(800); await mp.screenshot({ path: `${out}/home-mobile-menu.png` }); }

fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log('done', Object.keys(report));
