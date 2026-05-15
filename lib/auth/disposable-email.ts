/**
 * Domains commonly used for throwaway / temp inboxes.
 * Extend via env BLOCKED_EMAIL_DOMAINS (comma-separated).
 * Apple Hide My Email is allowlisted (not disposable in the abuse sense).
 */

const ALLOWLIST_DOMAINS = new Set<string>([
  'privaterelay.appleid.com',
  'icloud.com',
  'me.com',
  'mac.com',
]);

/** Lowercase hostnames only (no @, no subdomains stripped yet). */
const DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'pokemail.net',
  'spam4.me',
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.de',
  'coplurk.com',
  'disposemails.com',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'tempmail.net',
  'tempmailo.com',
  'tmpmail.org',
  'tmpmail.net',
  'yopmail.com',
  'yopmail.fr',
  'cool.fr.nf',
  'jetable.org',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'getnada.com',
  'moakt.com',
  'emailondeck.com',
  'throwaway.email',
  'fakeinbox.com',
  'trashmail.com',
  'maildrop.cc',
  'mailnesia.com',
  'mailcatch.com',
  'mintsmtp.com',
  'dispostable.com',
  'discard.email',
  'discardmail.com',
  'spamgourmet.com',
  'trashmail.de',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'trashmail.net',
  'emailfake.com',
  'fakemailgenerator.com',
  'burnermail.io',
  'tempail.com',
  'tempr.email',
  'dropmail.me',
  'harakirimail.com',
  'mailnull.com',
  'spamdecoy.net',
  'mytrashmail.com',
  'trashmail.ws',
  'mailinator.net',
  'mailinator2.com',
  'sogetthis.com',
  'notmailinator.com',
  'mailinater.com',
  'mohmal.com',
  'inboxkitten.com',
  '1secmail.com',
  '1secmail.org',
  '1secmail.net',
  'esiix.com',
  'vjuum.com',
  'laafd.com',
  'txcct.com',
  'rpilos.com',
  'wuuvo.com',
  'emailnax.com',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'einrot.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
]);

function parseExtraBlockedDomains(): Set<string> {
  const raw = process.env.BLOCKED_EMAIL_DOMAINS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

let extraCached: Set<string> | null = null;
function extraDomains(): Set<string> {
  if (!extraCached) extraCached = parseExtraBlockedDomains();
  return extraCached;
}

function hostnameFromEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;
  return trimmed.slice(at + 1);
}

/** True if this email uses a known disposable / throwaway domain (or env blocklist). */
export function isDisposableEmail(email: string): boolean {
  const host = hostnameFromEmail(email);
  if (!host) return true;

  if (ALLOWLIST_DOMAINS.has(host)) return false;

  const parts = host.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join('.');
    if (ALLOWLIST_DOMAINS.has(suffix)) return false;
    if (DISPOSABLE_DOMAINS.has(suffix)) return true;
    if (extraDomains().has(suffix)) return true;
  }

  return DISPOSABLE_DOMAINS.has(host) || extraDomains().has(host);
}
