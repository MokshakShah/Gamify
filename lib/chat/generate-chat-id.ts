import { randomBytes } from 'crypto';

/** URL-safe public chat id (e.g. for /dashboard/chat/x7Kp2mNqR4vL). */
export function generateChatId(): string {
  return randomBytes(12).toString('base64url');
}
