import { env } from "../config/env.js";

export async function sendTransactionalEmail({ to, toName, subject, html, text }) {
  if (!env.brevoApiKey) {
    if (env.nodeEnv === "production") {
      throw new Error("Email service is not configured.");
    }
    console.log("[dev email]", { to, subject, text });
    return { simulated: true };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.brevoApiKey,
    },
    body: JSON.stringify({
      sender: {
        name: env.brevoSenderName,
        email: env.brevoSenderEmail,
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Brevo error:", response.status, body);
    throw new Error("The evaluation email could not be sent.");
  }

  return response.json();
}

export function evaluationInviteEmail({ evaluatorName, eventName, link }) {
  const subject = `You have been invited to evaluate ${eventName}`;
  const text = [
    `Hello ${evaluatorName},`,
    "",
    `You have been invited to participate as an evaluator for ${eventName}.`,
    "",
    "Click the link below to access your evaluation page:",
    link,
    "",
    "No account or password is required.",
    "Your evaluation link is unique to you.",
    "",
    "Thank you.",
  ].join("\n");

  const html = `
  <div style="margin:0;padding:0;background:#F5F7FA;font-family:Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F7FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #E6EAF0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#0F2744;padding:28px 32px;">
                <p style="margin:0;color:#C9A227;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">Evaluation Invitation</p>
                <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:600;font-family:Georgia, serif;">You have been invited to evaluate</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;color:#0F2744;font-size:20px;font-weight:600;">${escapeHtml(eventName)}</p>
                <p style="margin:0 0 20px;color:#334155;font-size:16px;line-height:1.6;">Hello ${escapeHtml(evaluatorName)},</p>
                <p style="margin:0 0 20px;color:#334155;font-size:16px;line-height:1.6;">
                  You have been invited to participate as an evaluator for this event.
                  Click the button below to access your evaluation page.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${link}" style="display:inline-block;background:#0F2744;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">Start Evaluation</a>
                </p>
                <p style="margin:0 0 8px;color:#64748B;font-size:14px;line-height:1.6;">No account or password is required.</p>
                <p style="margin:0;color:#64748B;font-size:14px;line-height:1.6;">Your evaluation link is unique to you.</p>
                <p style="margin:24px 0 0;color:#334155;font-size:16px;">Thank you.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  return { subject, html, text };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
