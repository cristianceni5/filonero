import type { MailService, SendMagicLinkInput } from "./types";

export class ConsoleMailService implements MailService {
  async sendMagicLink(input: SendMagicLinkInput): Promise<void> {
    console.log("Magic link email (console fallback)", {
      to: input.to,
      nickname: input.nickname,
      expiresInMinutes: input.expiresInMinutes,
      magicLinkUrl: input.magicLinkUrl
    });
  }
}
