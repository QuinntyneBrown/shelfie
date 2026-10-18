import { test as base, expect } from '../../e2e/support/test';

// Draws a cursor and a click ripple so the recordings show where she is pointing.
export const CURSOR = `
addEventListener('DOMContentLoaded', () => {
  const cursor = document.createElement('div');
  cursor.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(255,120,60,.55);border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.4);transition:transform .12s;left:-50px;top:-50px';
  document.documentElement.append(cursor);
  addEventListener('mousemove', (e) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', (e) => {
    cursor.style.transform = 'scale(.7)';
    const ripple = document.createElement('div');
    ripple.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;border:3px solid rgba(255,120,60,.8);width:20px;height:20px;margin:-10px 0 0 -10px;left:' + e.clientX + 'px;top:' + e.clientY + 'px;transition:all .5s ease-out';
    document.documentElement.append(ripple);
    requestAnimationFrame(() => { ripple.style.transform = 'scale(3.5)'; ripple.style.opacity = '0'; });
    setTimeout(() => ripple.remove(), 600);
  }, true);
  addEventListener('mouseup', () => { cursor.style.transform = ''; }, true);
});
`;

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(CURSOR);
    await use(context);
  },
});

export { expect };
