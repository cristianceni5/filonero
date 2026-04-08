export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim();
}
