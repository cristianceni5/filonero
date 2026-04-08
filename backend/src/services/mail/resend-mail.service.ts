import { Resend } from "resend";
import { env } from "../../config/env";
import type { MailService, SendMagicLinkInput } from "./types";

export class ResendMailService implements MailService {
  private readonly resend: Resend;

  constructor() {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      throw new Error("ResendMailService requires RESEND_API_KEY and RESEND_FROM_EMAIL");
    }

    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async sendMagicLink(input: SendMagicLinkInput): Promise<void> {
    const subject = "Accedi a FiloNero";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>FiloNero</h2>
        <p>Ciao ${input.nickname},</p>
        <p>usa questo link per accedere. Il link scade tra ${input.expiresInMinutes} minuti.</p>
        <p><a href="${input.magicLinkUrl}" target="_blank" rel="noopener noreferrer">Accedi con magic link</a></p>
        <p>Se non hai richiesto questo accesso, puoi ignorare questa email.</p>
      </div>
    `;

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL as string,
      to: [input.to],
      subject,
      html
    });
  }
}
