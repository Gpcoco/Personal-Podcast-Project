import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function formatAnalysis(text: string): string {
  return text
    .split("---")
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.trim().length > 0);
      const htmlLines = lines.map((line) => {
        line = line.trim();
        if (line.startsWith("🐦") || line.startsWith("📊")) {
          return `<h3 style="color:#1d9bf0;margin:16px 0 8px;font-size:15px">${line}</h3>`;
        }
        if (line.startsWith("📌") || line.startsWith("💡")) {
          return `<h4 style="color:#444;margin:12px 0 4px;font-size:14px">${line}</h4>`;
        }
        if (line.startsWith("•")) {
          return `<div style="padding:3px 0 3px 16px;color:#333;font-size:14px">${line}</div>`;
        }
        if (line.startsWith("-") && !line.startsWith("---")) {
          return `<div style="padding:3px 0 3px 16px;color:#333;font-size:14px">• ${line.slice(1).trim()}</div>`;
        }
        if (line.startsWith('"') && line.endsWith('"')) {
          return `<div style="background:#f0f7ff;border-left:3px solid #1d9bf0;padding:10px 14px;margin:8px 0;font-style:italic;color:#222;font-size:14px">${line}</div>`;
        }
        if (line.startsWith("📅")) {
          return `<div style="color:#999;font-size:12px;margin-bottom:8px">${line}</div>`;
        }
        return `<div style="color:#333;font-size:14px;padding:2px 0">${line}</div>`;
      });
      return `<div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #eee">${htmlLines.join("")}</div>`;
    })
    .join("");
}

export async function sendReport(
  analyses: { author: string; tweetCount: number; analysis: string }[]
): Promise<void> {
  const date = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const body = analyses
    .map(
      ({ author, tweetCount, analysis }) => `
      <div style="margin-bottom:48px">
        <div style="background:#1d9bf0;color:white;padding:12px 20px;border-radius:8px 8px 0 0">
          <span style="font-size:18px;font-weight:bold">@${author}</span>
          <span style="font-size:13px;opacity:0.8;margin-left:12px">${tweetCount} tweet analizzati</span>
        </div>
        <div style="background:#ffffff;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none">
          ${formatAnalysis(analysis)}
        </div>
      </div>
    `
    )
    .join("");

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.RECIPIENT_EMAIL,
    subject: `📊 Twitter Report — ${date}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:32px 24px;color:#222">
        <h1 style="font-size:24px;margin-bottom:4px">📊 Twitter Daily Report</h1>
        <p style="color:#888;font-size:14px;margin-bottom:40px;border-bottom:1px solid #eee;padding-bottom:16px">${date}</p>
        ${body}
        <p style="color:#bbb;font-size:12px;margin-top:40px;text-align:center">Generato automaticamente da Twitter Analytics</p>
      </div>
    `,
  });
}

export async function sendSingleTweetEmail(
  tweet: { author: string; text: string; created_at: string; like_count: number; view_count: number },
  analysis: string
) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2>🔍 Analisi Tweet — @${tweet.author}</h2>
      <div style="background: #f5f5f5; padding: 16px; border-left: 4px solid #1da1f2; margin-bottom: 24px;">
        <p style="margin:0; font-style: italic;">"${tweet.text}"</p>
        <p style="margin:8px 0 0; font-size: 12px; color: #666;">
          ${new Date(tweet.created_at).toLocaleDateString('it-IT')} &nbsp;|&nbsp;
          ❤️ ${tweet.like_count} &nbsp;|&nbsp;
          👁️ ${tweet.view_count}
        </p>
      </div>
      <div style="white-space: pre-wrap; line-height: 1.6;">
        ${analysis.replace(/\n/g, '<br>')}
      </div>
      <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 11px; color: #aaa;">Twitter Analytics · Analisi on-demand</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.GMAIL_USER!,
    to: process.env.RECIPIENT_EMAIL!,
    subject: `🔍 Analisi Tweet @${tweet.author} — ${new Date().toLocaleDateString('it-IT')}`,
    html,
  });
}