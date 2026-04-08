import { env } from "../../config/env";
import { ConsoleMailService } from "./console-mail.service";
import { ResendMailService } from "./resend-mail.service";
import type { MailService } from "./types";

let mailService: MailService | null = null;

export function getMailService(): MailService {
  if (mailService) {
    return mailService;
  }

  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    mailService = new ResendMailService();
    return mailService;
  }

  mailService = new ConsoleMailService();
  return mailService;
}
