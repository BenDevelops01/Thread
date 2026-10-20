import { createSupabaseAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: '2024-06-20',
})

async function syncPremiumForUser(admin: any, userId: string, sub: any) {
  const status = sub.status
  const active = status === 'active' || status === 'trialing'
  if (active) {
    await admin.from('profiles').update({
      plan: 'premium',
      plan_source: 'stripe',
      plan_expires_at: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    }).eq('id', userId)
  } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due' || status === 'incomplete_expired') {
    // Only downgrade if it was set by stripe - don't clobber founder/redeem codes
    const { data: profile } = await admin.from('profiles').select('plan_source').eq('id', userId).maybeSingle()
    if (profile?.plan_source === 'stripe') {
      await admin.from('profiles').update({
        plan: 'free',
        plan_source: 'free',
        plan_expires_at: null,
      }).eq('id', userId)
    }
  }
}

export async function POST({ request }: { request: Request }) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) return new Response('missing signature', { status: 400 })

  let body: string
  try {
    body = await request.text()
  } catch {
    return new Response('bad body', { status: 400 })
  }

  let stripeEvent: any
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return new Response(`webhook error: ${err.message}`, { status: 400 })
  }

  const admin: any = createSupabaseAdminClient()

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object
      if (session.mode === 'subscription' && session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        const sub: any = await stripe.subscriptions.retrieve(subId)
        const userId = session.metadata?.supabase_user_id || sub.metadata?.supabase_user_id
        if (userId) {
          await admin.from('subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: sub.id,
            status: sub.status,
            price_id: sub.items?.data?.[0]?.price?.id ?? null,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            cancel_at_period_end: !!sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'stripe_subscription_id' })
          await syncPremiumForUser(admin, userId, sub)
        }
      }
    } else if (stripeEvent.type === 'customer.subscription.updated' || stripeEvent.type === 'customer.subscription.deleted') {
      const sub: any = stripeEvent.data.object
      const userId = sub.metadata?.supabase_user_id
      if (userId) {
        await admin.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          status: sub.status,
          price_id: sub.items?.data?.[0]?.price?.id ?? null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: !!sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })
        await syncPremiumForUser(admin, userId, sub)
      }
    }
  } catch (e: any) {
    console.error('webhook handler error', e)
    return new Response('handler error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}
