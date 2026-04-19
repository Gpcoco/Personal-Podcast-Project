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

  // Converti markdown base in HTML
  const formattedAnalysis = analysis
    .replace(/^## (.+)$/gm, '<h2 style="color:#1a1a1a;margin-top:28px;margin-bottom:8px;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="color:#333;margin-top:20px;margin-bottom:6px;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:6px;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:8px 0;">$&</ul>')
    .replace(/\n{2,}/g, '</p><p style="margin:0 0 12px;">')
    .replace(/\n/g, '<br>');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f9f9;">
  <div style="font-family:Georgia,serif;max-width:680px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    
    <div style="background:#1da1f2;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">🔍 Analisi Tweet</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">@${tweet.author} · ${new Date(tweet.created_at).toLocaleDateString('it-IT')}</p>
    </div>

    <div style="padding:24px 32px;background:#f0f8ff;border-left:4px solid #1da1f2;">
      <p style="margin:0;font-style:italic;color:#333;line-height:1.6;">"${tweet.text}"</p>
      <p style="margin:12px 0 0;font-size:12px;color:#888;">
        ❤️ ${tweet.like_count} like &nbsp;|&nbsp; 👁️ ${tweet.view_count} visualizzazioni
      </p>
    </div>

    <div style="padding:32px;line-height:1.7;color:#222;font-size:15px;">
      <p style="margin:0 0 12px;">${formattedAnalysis}</p>
    </div>

    <div style="padding:16px 32px;background:#f5f5f5;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#aaa;">Twitter Analytics · Analisi on-demand</p>
    </div>

  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.GMAIL_USER!,
    to: process.env.RECIPIENT_EMAIL!,
    subject: `🔍 Analisi Tweet @${tweet.author} — ${new Date().toLocaleDateString('it-IT')}`,
    html,
  });
}