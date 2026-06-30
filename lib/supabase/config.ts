export type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

/** Reads `ref` from a Supabase JWT (service_role / anon). */
function projectRefFromJwt(jwt: string): string | null {
  try {
    const payloadPart = jwt.split('.')[1];
    if (!payloadPart) return null;
    const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { ref?: string };
    return typeof payload.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

export function getSupabaseConfigError(): string | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

  if (!rawUrl || !serviceKey) {
    return 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables';
  }

  if (
    !rawUrl.startsWith('https://') &&
    !rawUrl.startsWith('http://')
  ) {
    return (
      'NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL (https://xxxx.supabase.co), ' +
      'not an API key. Find it in Supabase Dashboard → Settings → API → Project URL.'
    );
  }

  let hostname = '';
  try {
    const parsed = new URL(rawUrl);
    hostname = parsed.hostname;
    if (!hostname.includes('supabase')) {
      return `NEXT_PUBLIC_SUPABASE_URL looks wrong (${hostname}). Expected *.supabase.co`;
    }
  } catch {
    return 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL.';
  }

  const refFromKey = projectRefFromJwt(serviceKey);
  if (refFromKey) {
    const expectedHost = `${refFromKey}.supabase.co`;
    if (hostname !== expectedHost) {
      return (
        `NEXT_PUBLIC_SUPABASE_URL hostname "${hostname}" does not match your service_role key ` +
        `(expected https://${expectedHost}). Copy the exact Project URL from Supabase Dashboard → Settings → API.`
      );
    }
  }

  return null;
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const configError = getSupabaseConfigError();
  if (configError) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[gamify] Supabase config: ${configError}`);
    }
    return null;
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  };
}
