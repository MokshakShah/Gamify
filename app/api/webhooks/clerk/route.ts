import type { WebhookEvent } from '@clerk/backend';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import {
  deleteClerkProfile,
  upsertClerkProfileFromWebhook,
  type ClerkWebhookUser,
} from '@/lib/supabase/sync-clerk-profile';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[clerk webhook] CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    );
  }

  const headerPayload = headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  const payload = await req.text();

  let event: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('[clerk webhook] verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        await upsertClerkProfileFromWebhook(
          event.data as ClerkWebhookUser
        );
        break;
      }
      case 'user.deleted': {
        const id = (event.data as { id?: string }).id;
        if (id) await deleteClerkProfile(id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[clerk webhook] handler error', event.type, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
