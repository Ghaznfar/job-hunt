import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Development mailer — writes the message to the log instead of sending. */
class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    logger.info(
      { to: message.to, subject: message.subject },
      `[email:console] ${message.subject}\n${message.text}`,
    );
  }
}

class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend send failed: ${res.status} ${body}`);
    }
  }
}

let cached: Mailer | null = null;

export function getMailer(): Mailer {
  if (cached) return cached;
  if (env.EMAIL_DRIVER === "resend" && env.RESEND_API_KEY) {
    cached = new ResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM);
  } else {
    cached = new ConsoleMailer();
  }
  return cached;
}

// ---- Templated messages -------------------------------------------------------

function layout(title: string, body: string): { html: string; text: string } {
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<h2>${title}</h2>${body}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
<p style="color:#888;font-size:12px">JobHunt — sent because someone used this email to sign up. If that wasn't you, ignore this message.</p>
</body></html>`;
  const text = `${title}\n\n${body.replace(/<[^>]+>/g, "")}`;
  return { html, text };
}

export async function sendVerificationEmail(to: string, url: string) {
  const { html, text } = layout(
    "Confirm your email",
    `<p>Click the link below to verify your JobHunt account:</p><p><a href="${url}">${url}</a></p>`,
  );
  await getMailer().send({ to, subject: "Verify your JobHunt email", html, text });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  const { html, text } = layout(
    "Reset your password",
    `<p>We received a request to reset your JobHunt password. This link expires in 1 hour:</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, you can safely ignore it.</p>`,
  );
  await getMailer().send({ to, subject: "Reset your JobHunt password", html, text });
}
