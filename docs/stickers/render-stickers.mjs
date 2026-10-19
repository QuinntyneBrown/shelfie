/**
 * Renders the Shelfie die-cut stickers to print-ready transparent PNGs.
 *
 *   node docs/stickers/render-stickers.mjs
 *
 * Playwright is not a dependency of this folder — it is the e2e workspace's
 * @playwright/test, which npm hoists to the repo root node_modules. Set
 * SHELFIE_MODULE_ROOT to resolve it from somewhere else, and
 * SHELFIE_CHROMIUM to a Chromium executable if Playwright's own is missing.
 *
 * Each sticker's .stage element is exactly 900 x 900 CSS px, which at
 * deviceScaleFactor 1 is 900 x 900 device px = 3 inches at 300 DPI.
 * omitBackground:true is what makes the outside of the die-cut transparent.
 */
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const moduleRoot = process.env.SHELFIE_MODULE_ROOT ?? path.join(repoRoot, 'e2e')

const require = createRequire(pathToFileURL(path.join(moduleRoot, 'package.json')))
const { chromium } = require('@playwright/test')

const STICKERS = [
  { slug: 'sticker-1-app-icon', title: 'Shelfie app icon' },
  { slug: 'sticker-2-book-stack', title: 'Wordmark book stack' },
  { slug: 'sticker-3-gold-star', title: 'Gold star reward' },
]

/** PNG chunk reader — enough to assert dimensions and pixel format. */
function readPngHeader(buffer) {
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  const bitDepth = buffer.readUInt8(24)
  const colourType = buffer.readUInt8(25) // 6 = truecolour with alpha
  return { width, height, bitDepth, colourType }
}

const browser = await chromium.launch({
  executablePath: process.env.SHELFIE_CHROMIUM,
  args: ['--allow-file-access-from-files', '--font-render-hinting=none'],
})

/**
 * Lifts the <svg> out of a sticker's HTML into a standalone, editable file.
 * Generated rather than hand-maintained so the SVG can never drift from the
 * PNG. The stylesheet cannot be linked from a standalone SVG, so the font
 * faces and the keyline rules are inlined from stickers.css.
 */
async function exportSvg(slug, title) {
  const html = await readFile(path.join(here, 'src', `${slug}.html`), 'utf8')
  const css = await readFile(path.join(here, 'src', 'stickers.css'), 'utf8')

  // Inline each face's TTF as a base64 data URI rather than pointing at the
  // file on disk. A relative url() only resolves when the SVG is opened as a
  // top-level document; embedded as an <img> (GitHub, image viewers, most
  // editors) the browser refuses to fetch an external font and falls back to a
  // system serif — the text would no longer be Nunito like the PNG.
  // The data URI travels inside the file, so the type renders identically
  // everywhere and stays live (still selectable/editable, unlike outlines).
  const fontFaces = (
    await Promise.all(
      [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map(async (m) => {
        const ref = m[0].match(/url\("fonts\/([^"]+)"\)/)
        if (!ref) return m[0]
        const data = (await readFile(path.join(here, 'src', 'fonts', ref[1]))).toString('base64')
        return m[0].replace(/url\("fonts\/[^"]+"\)/, `url("data:font/ttf;base64,${data}")`)
      })
    )
  ).join('\n')
  const idioms = css.slice(css.indexOf('/* --- Shared artwork idioms')).trim()

  // Matched on /<svg[\s>]/ rather than the literal '<svg ' so that a source file
  // is free to break its opening tag across lines. With the literal, a multi-line
  // <svg> tag silently missed, and everything from the HTML <head> onward got
  // swallowed into the exported SVG.
  const svgOpen = html.search(/<svg[\s>]/)
  const svgTagEnd = html.indexOf('>', svgOpen)
  const inner = html.slice(svgTagEnd + 1, html.lastIndexOf('</svg>'))

  // A sticker that scales its art sets --cut-extra on its <svg> element to
  // compensate (see stickers.css). Only the element's inner markup is reused
  // below, so that declaration has to be carried across explicitly — without
  // it the standalone SVG falls back to the :root default and its die cut no
  // longer matches the PNG's alpha edge.
  const cutExtra = html.slice(svgOpen, svgTagEnd).match(/--cut-extra:\s*([\d.]+px)/)

  // The silhouette group is the first <g> after the SVG's <title>; reusing it
  // as a hidden magenta layer gives prepress the artwork outline to trace. If a
  // sticker ever wraps its art in a fit-to-canvas <g transform>, the cutline has
  // to carry the same transform as the artwork it mirrors.
  const fit = inner.match(/<g transform="([^"]+)">/)
  const silhouette = inner.slice(inner.indexOf('<g>'), inner.indexOf('</g>') + 4)
  const cutline = silhouette
    .replace(/class="keyline cut-[a-z]+"/g, 'class="cutline-path"')
    .replace('<g>', `<g id="cutline"${fit ? ` transform="${fit[1]}"` : ''}>`)
    .replace(/^ +/gm, (indent) => indent.slice(6))

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Shelfie die-cut sticker — ${title}
  Generated by docs/stickers/render-stickers.mjs from src/${slug}.html.
  Edit the HTML, not this file.

  The die cut is the outer edge of the white keyline, which is also the alpha
  edge of ${slug}.png. #cutline below traces the *artwork* outline in magenta —
  the prepress convention — and is hidden by default; the actual cut runs the
  width of the white keyline outside it: 65px, 0.217in at 300 DPI.
  Text is live — outline it before sending this SVG to a printer that is not
  rasterising the PNG.
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" width="3in" height="3in"${cutExtra ? ` style="--cut-extra: ${cutExtra[1]}"` : ''}>
  <title>${title}</title>
  <defs>
    <style>
${fontFaces.replace(/^/gm, '      ')}

${idioms.replace(/^/gm, '      ')}

      #cutline { display: none; }
      .cutline-path {
        fill: none;
        stroke: #ff00ff;
        stroke-width: 2;
        stroke-linejoin: round;
      }
    </style>
  </defs>
${inner.trimEnd()}
  ${cutline}
</svg>
`
  const out = path.join(here, `${slug}.svg`)
  await writeFile(out, svg)
  return out
}

async function render(slug, { preview }) {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 1100 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const src = pathToFileURL(path.join(here, 'src', `${slug}.html`)).href
  await page.goto(src, { waitUntil: 'load' })

  if (preview) await page.evaluate(() => document.body.classList.add('preview'))

  // Force Nunito to load at both display weights, then hard-fail rather than
  // silently shipping a fallback font.
  const missing = await page.evaluate(async () => {
    const specs = [
      ['Nunito 800', '800 42px "Nunito"'],
      ['Nunito 900', '900 72px "Nunito"'],
    ]
    await Promise.all(specs.map(([, spec]) => document.fonts.load(spec).catch(() => {})))
    await document.fonts.ready
    return specs.filter(([, spec]) => !document.fonts.check(spec)).map(([name]) => name)
  })
  if (missing.length) {
    throw new Error(`${slug}: web fonts did not load: ${missing.join(', ')}`)
  }

  const out = path.join(here, preview ? `${slug}-preview.png` : `${slug}.png`)
  await page.locator('.stage').screenshot({
    path: out,
    omitBackground: !preview,
    animations: 'disabled',
  })
  await context.close()
  return out
}

/**
 * Decodes the exported PNG in the browser and reports the alpha bounding box.
 * That box is the die cut: whatever Jukebox's cut-line generator will trace.
 */
async function measureAlpha(pngPath) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const dataUri = `data:image/png;base64,${(await readFile(pngPath)).toString('base64')}`
  const result = await page.evaluate(async (uri) => {
    const img = new Image()
    img.src = uri
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, img.width, img.height)
    let minX = img.width, minY = img.height, maxX = -1, maxY = -1
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        if (data[(y * img.width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    const at = (x, y) => data[(y * img.width + x) * 4 + 3]
    return {
      minX, minY, maxX, maxY,
      corners: [
        at(0, 0),
        at(img.width - 1, 0),
        at(0, img.height - 1),
        at(img.width - 1, img.height - 1),
      ],
    }
  }, dataUri)
  await context.close()
  return result
}

try {
  for (const { slug, title } of STICKERS) {
    const printPath = await render(slug, { preview: false })
    const previewPath = await render(slug, { preview: true })

    const png = await readFile(printPath)
    const { width, height, colourType } = readPngHeader(png)
    if (width !== 900 || height !== 900) {
      throw new Error(`${slug}: expected 900x900, got ${width}x${height}`)
    }
    if (colourType !== 6) {
      throw new Error(`${slug}: expected RGBA (colour type 6), got ${colourType}`)
    }

    const { minX, minY, maxX, maxY, corners } = await measureAlpha(printPath)
    if (corners.some((a) => a !== 0)) {
      throw new Error(`${slug}: corners are not transparent (${corners.join(',')}) — omitBackground failed`)
    }
    if (minX < 2 || minY < 2 || maxX > width - 3 || maxY > height - 3) {
      throw new Error(
        `${slug}: artwork touches the canvas edge (x ${minX}-${maxX}, y ${minY}-${maxY}) — the die cut would be clipped`
      )
    }

    await exportSvg(slug, title)

    const artW = maxX - minX + 1
    const artH = maxY - minY + 1
    const inches = (px) => (px / 300).toFixed(2)
    console.log(
      `✓ ${title.padEnd(28)} ${path.basename(printPath).padEnd(30)} cut ${artW}x${artH}px (${inches(artW)}" x ${inches(artH)}")  margins L${minX} R${width - 1 - maxX} T${minY} B${height - 1 - maxY}`
    )
  }

  // Contact sheet, handy for reviewing all three at sticker size at once.
  const context = await browser.newContext({ viewport: { width: 1500, height: 620 } })
  const page = await context.newPage()
  // Inlined as data URIs — a setContent page has an opaque origin and cannot
  // load file:// images.
  const tiles = await Promise.all(
    STICKERS.map(async ({ slug, title }) => {
      const data = (await readFile(path.join(here, `${slug}.png`))).toString('base64')
      return `<figure><img src="data:image/png;base64,${data}" width="380"><figcaption>${title}</figcaption></figure>`
    })
  ).then((parts) => parts.join(''))
  await page.setContent(
    `<body style="margin:0;padding:40px;background:#f6f7f9;display:flex;gap:36px;align-items:flex-start;font:600 16px system-ui;color:#1a1e26">
       <style>figure{margin:0;text-align:center}figcaption{margin-top:14px}img{display:block}</style>
       ${tiles}
     </body>`
  )
  await page.waitForTimeout(500)
  const sheet = path.join(here, 'contact-sheet.png')
  await page.locator('body').screenshot({ path: sheet })
  await context.close()
  console.log(`✓ ${'contact sheet'.padEnd(28)} ${path.basename(sheet)}`)
} finally {
  await browser.close()
}
