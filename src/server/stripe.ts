import { createServerFn } from '@tanstack/react-start'
import Stripe from 'stripe'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: '2024-06-20',
})

export const createCheckoutSession = createServerFn({ method: 'POST' }).handler(
  async () => {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) throw new Error('Not signed in')

    const admin: any = createSupabaseAdminClient()
    const { data: existing } = await admin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = existing?.stripe_customer_id
    if (!customerId) {
      const customer: any = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await admin.from('stripe_customers').insert({
        user_id: user.id,
        stripe_customer_id: customerId,
      })
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://thread-cool.vercel.app')

    const session: any = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID_MONTHLY!, quantity: 1 }],
      success_url: `${origin}/app/settings?success=1`,
      cancel_url: `${origin}/app/settings?canceled=1`,
      subscription_data: { metadata: { supabase_user_id: user.id } },
    })

    return { url: session.url }
  },
)

export const createPortalSession = createServerFn({ method: 'POST' }).handler(
  async () => {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const admin: any = createSupabaseAdminClient()
    const { data: existing } = await admin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing?.stripe_customer_id) throw new Error('No billing account')

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://thread-cool.vercel.app')

    const session: any = await stripe.billingPortal.sessions.create({
      customer: existing.stripe_customer_id,
      return_url: `${origin}/app/settings`,
    })

    return { url: session.url }
  },
)
