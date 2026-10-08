import { config } from "../../shared/config/config.js";

/** Content ID of the logo that the mailer attaches to every HTML email. */
export const EMAIL_LOGO_CID = "openmeshtak-logo";

export interface EmailContent {
  instanceName: string;
  title: string;
  /** Usually "Hello <name>,"; names come from users, so every value is escaped below. */
  greeting?: string;
  paragraphs: string[];
  /** One button; its URL is also printed as text for clients that hide the button. */
  action?: { label: string; url: string };
  /** Small print after the action, such as how long a link works. */
  note?: string;
  /** Extra footer line, such as "If this was not you, contact your organizers." */
  footerNote?: string;
}

export interface RenderedEmail {
  text: string;
  html: string;
}

// The dark Web theme (openmeshtak-web, src/app/providers/vuetify.ts), so emails match the app.
const COLORS = {
  page: "#111418",
  card: "#1A1F25",
  footer: "#15191E",
  border: "#2A313A",
  heading: "#F5F7FA",
  text: "#E2E8F0",
  muted: "#A0AEC0",
  primary: "#7FB0E8",
  onPrimary: "#111418",
};

const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paragraph(text: string, style: string): string {
  return `<p style="margin:0 0 16px;${style}">${escapeHtml(text)}</p>`;
}

function renderText(content: EmailContent): string {
  const parts = [content.greeting, ...content.paragraphs];
  if (content.action !== undefined) {
    parts.push(`${content.action.label}:\n${content.action.url}`);
  }
  parts.push(content.note);
  const footer = [`--\n${content.instanceName} · ${config.publicOrigin}`, content.footerNote].filter((line) => line !== undefined);
  return [...parts.filter((part) => part !== undefined), footer.join("\n")].join("\n\n");
}

function renderAction(action: NonNullable<EmailContent["action"]>): string {
  const url = escapeHtml(action.url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="border-radius:8px;background:${COLORS.primary};">
<a href="${url}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:${COLORS.onPrimary};text-decoration:none;border-radius:8px;">${escapeHtml(action.label)}</a>
</td></tr></table>`;
}

function renderLinkFallback(action: NonNullable<EmailContent["action"]>): string {
  const url = escapeHtml(action.url);
  return `<p style="margin:0;font-size:12px;color:${COLORS.muted};word-break:break-all;">Button not working? Open this link:<br><a href="${url}" style="color:${COLORS.primary};">${url}</a></p>`;
}

/**
 * Table layout with inline styles, because many email clients ignore stylesheets and flexbox.
 * Callers pass plain strings only; this is the single place that writes HTML.
 */
function renderHtml(content: EmailContent): string {
  const name = escapeHtml(content.instanceName);
  const body = [
    `<h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:${COLORS.heading};">${escapeHtml(content.title)}</h1>`,
    content.greeting === undefined ? "" : paragraph(content.greeting, ""),
    ...content.paragraphs.map((text) => paragraph(text, "")),
    content.action === undefined ? "" : renderAction(content.action),
    content.note === undefined ? "" : paragraph(content.note, `font-size:13px;color:${COLORS.muted};`),
    content.action === undefined ? "" : renderLinkFallback(content.action),
  ].join("\n");
  const footerNote = content.footerNote === undefined ? "" : `<br>${escapeHtml(content.footerNote)}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};font-family:${FONT};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:12px;">
<tr><td style="padding:18px 28px;border-bottom:1px solid ${COLORS.border};">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;"><img src="cid:${EMAIL_LOGO_CID}" width="32" height="32" alt="" style="display:block;border:0;border-radius:7px;"></td>
<td style="font-size:15px;font-weight:600;color:${COLORS.heading};">${name}</td>
</tr></table>
</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6;color:${COLORS.text};">
${body}
</td></tr>
<tr><td style="padding:16px 28px;background:${COLORS.footer};border-top:1px solid ${COLORS.border};border-radius:0 0 12px 12px;font-size:12px;line-height:1.5;color:${COLORS.muted};">
${name} · ${escapeHtml(config.publicOrigin)}${footerNote}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Builds the plain-text and the HTML version of one email from the same content. */
export function renderEmail(content: EmailContent): RenderedEmail {
  return { text: renderText(content), html: renderHtml(content) };
}
