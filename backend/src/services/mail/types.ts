export type SendMagicLinkInput = {
  to: string;
  nickname: string;
  magicLinkUrl: string;
  expiresInMinutes: number;
};

export interface MailService {
  sendMagicLink(input: SendMagicLinkInput): Promise<void>;
}
