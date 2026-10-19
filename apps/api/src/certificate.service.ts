import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { getBook } from './books.service.ts';
import { readCover } from './covers.service.ts';
import { get, type Db } from './db.ts';
import { Problem } from './problem.ts';

// The design system's cover palette (docs/design-system/tokens/tokens.css); pdfkit knows nothing of CSS tokens.
const COVER_HEX: Record<string, string> = {
  sage: '#cfe8d5',
  rose: '#f9d5e0',
  sky: '#cfe6fb',
  sun: '#fbe7b2',
  lilac: '#e3d9fb',
  mint: '#cdf1ec',
  peach: '#fddcc8',
};
const INK = '#2b2320';
const SOFT_INK = '#7a5a4d';
const PAPER = '#fffdf8';
const GOLD = '#fbe7b2';

const A4_LANDSCAPE = { width: 841.89, height: 595.28 };

/** Draws the one-page finish certificate of a finished book, or throws 404 not-found / 409 not-finished (L2-114). */
export async function renderCertificate(db: Db, householdId: string, bookId: string): Promise<Buffer> {
  const book = await getBook(db, householdId, bookId);
  if (!book.finishedAt) throw new Problem(409, 'not-finished');
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const finishedOn = new Intl.DateTimeFormat('en-GB', { timeZone: time_zone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(book.finishedAt)).replace(',', '');
  // Covers are stored as WebP, which pdfkit cannot embed; PNG keeps it lossless.
  const cover = await readCover(db, householdId, bookId);
  const picture = cover ? await sharp(cover.image).png().toBuffer() : null;

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `${book.readerName} read ${book.title}` } });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const { width, height } = A4_LANDSCAPE;
  const colour = COVER_HEX[book.coverColor] ?? COVER_HEX['rose']!;
  doc.rect(0, 0, width, height).fill(PAPER);
  // Band on the left, in the cover colour, with the cover picture on it when the book has one.
  const bandWidth = width * 0.09;
  doc.rect(0, 0, bandWidth, height).fill(colour);
  if (picture) {
    const w = bandWidth * 0.6;
    doc.save().roundedRect((bandWidth - w) / 2, height / 2 - w / 2, w, w, 6).clip().image(picture, (bandWidth - w) / 2, height / 2 - w / 2, { width: w, height: w }).restore();
  }
  // Frame.
  doc.lineWidth(3).roundedRect(width * 0.13, height * 0.04, width * 0.84, height * 0.92, 12).stroke(colour);

  const left = width * 0.17;
  const textWidth = width * 0.76;
  const centred = { width: textWidth, align: 'center' as const };
  doc.font('Helvetica-Bold').fontSize(18).fillColor(SOFT_INK).text('Shelfie', left, height * 0.1, centred);
  doc.font('Helvetica').fontSize(13).fillColor(SOFT_INK).text('CERTIFICATE OF ACHIEVEMENT', left, height * 0.24, { ...centred, characterSpacing: 3 });
  doc.font('Helvetica-Bold').fontSize(64).fillColor(INK).text(book.readerName, left, height * 0.32, centred);
  const by = book.author?.trim() ? ` by ${book.author.trim()}` : '';
  doc.font('Helvetica').fontSize(24).fillColor(INK).text(`read ${book.title}${by}`, left, height * 0.56, centred);
  doc.text(`all ${book.chapterCount} chapters, start to finish`, left, height * 0.64, centred);
  doc.fontSize(16).fillColor(SOFT_INK).text(`Finished on ${finishedOn}`, left, height * 0.8, centred);
  // Seal, bottom right.
  doc.circle(width * 0.9, height * 0.84, 38).fill(GOLD);
  doc.circle(width * 0.9, height * 0.84, 30).lineWidth(2).stroke(SOFT_INK);

  doc.end();
  return done;
}

/** Lower-case letters, digits and hyphens only, so the name is safe in a header on every browser. */
export const certificateFileName = (readerName: string, title: string) =>
  `${[readerName, title].map((part) => part.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).join('-')}-certificate.pdf`;
