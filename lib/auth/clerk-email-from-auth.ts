import type { AuthObject } from '@clerk/backend';

import { clerkClient } from '@clerk/nextjs/server';

function emailFromSessionClaims(
  sessionClaims: AuthObject['sessionClaims']
): string | null {
  if (!sessionClaims || typeof sessionClaims !== 'object') return null;
  const c = sessionClaims as Record<string, unknown>;
  if (typeof c.email === 'string' && c.email.includes('@')) return c.email;
  if (typeof c.primary_email === 'string' && c.primary_email.includes('@')) {
    return c.primary_email;
  }
  return null;
}

/** Primary sign-in email for middleware checks (JWT claim first, then Clerk API). */
export async function getPrimaryEmailForUser(
  auth: AuthObject
): Promise<string | null> {
  const fromClaims = emailFromSessionClaims(auth.sessionClaims);
  if (fromClaims) return fromClaims;

  if (!auth.userId) return null;

  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const primaryId = user.primaryEmailAddressId;
    if (primaryId) {
      const match = user.emailAddresses.find((e) => e.id === primaryId);
      if (match) return match.emailAddress;
    }
    return user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}
