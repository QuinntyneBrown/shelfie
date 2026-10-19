/** What every Shelfie mail says: one heading, a paragraph or two, one button and why the mail came. */
export interface MailContent {
  heading: string;
  paragraphs: string[];
  button: { label: string; url: string };
  footer: string;
}

// Light-theme token values, resolved, because mail clients read neither stylesheets nor custom properties
// (docs/design-system/foundations/email.html). This is the only place they are written.
const FONT = "ui-rounded, 'SF Pro Rounded', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const CANVAS = '#f6f7f9';
const SURFACE = '#ffffff';
const BORDER = '#dfe3e8';
const TEXT = '#1a1e26';
const MUTED = '#5e6675';
const ACCENT = '#7c3aed';
const ON_ACCENT = '#ffffff';
const LINK = '#6d28d9';

const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

/** The branded HTML part, a single fluid column of tables with inline styles, and the plain-text part with the same words. */
export function renderMail({ heading, paragraphs, button, footer }: MailContent): { html: string; text: string } {
  const appUrl = process.env.APP_URL ?? 'http://localhost:4200';
  const url = escape(button.url);
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.5;color:${TEXT};">${escape(p)}</p>`)
    .join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background-color:${CANVAS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td align="center" style="padding:0 0 24px;"><img src="${escape(appUrl)}/logo.png" width="56" height="56" alt="Shelfie" style="display:block;border:0;border-radius:16px;"></td></tr>
<tr><td style="background-color:${SURFACE};border:1px solid ${BORDER};border-radius:24px;padding:32px 24px;">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${TEXT};">${escape(heading)}</h1>
${body}<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td align="center" bgcolor="${ACCENT}" style="border-radius:999px;background-color:${ACCENT};"><a href="${url}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;line-height:1.25;font-weight:600;color:${ON_ACCENT};text-decoration:none;border-radius:999px;">${escape(button.label)}</a></td></tr></table>
<p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.5;color:${MUTED};">Button not working? Copy this link into your browser:<br><a href="${url}" style="color:${LINK};word-break:break-all;">${url}</a></p>
</td></tr>
<tr><td align="center" style="padding:24px 16px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${MUTED};">${escape(footer)}<br>Shelfie · Reading, one chapter at a time · <a href="https://www.shelfie.kids" style="color:${LINK};">shelfie.kids</a></td></tr>
</table>
</td></tr>
</table>
</body></html>
`;
  const text = [heading, ...paragraphs, button.url, footer, 'Shelfie · https://www.shelfie.kids'].join('\n\n') + '\n';
  return { html, text };
}
