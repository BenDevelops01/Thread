import { createHash } from 'node:crypto'

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

function hashCode(code: string) {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
}

function envHashes(): string[] {
  return (process.env.THREAD_REDEEM_CODE_HASHES ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
}

export interface RedeemResult {
  ok: boolean
  message: string
  plan?: 'premium'
}

/**
 * Redeem a code to unlock premium. Verification is server-side only;
 * plaintext codes never reach the client bundle.
 */
export const redeemCode = createServerFn({ method: 'POST' })
  .validator(z.object({ code: z.string().min(1).max(120) }))
  .handler(async ({ data }): Promise<RedeemResult> => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: false, message: 'You must be signed in to redeem a code.' }

    const hash = hashCode(data.code)

    // Fast path: founder/staff codes from env
    const isEnvCode = envHashes().includes(hash)

    const admin = createSupabaseAdminClient()

    if (!isEnvCode) {
      const { data: code } = await admin
        .from('redeem_codes')
        .select('*')
        .eq('code_hash', hash)
        .eq('active', true)
        .maybeSingle()

      if (!code) return { ok: false, message: 'That code is not valid.' }
      if (code.max_uses != null && code.uses >= code.max_uses) {
        return { ok: false, message: 'That code has already been fully redeemed.' }
      }

      await admin
        .from('redeem_codes')
        .update({ uses: code.uses + 1 })
        .eq('id', code.id)
      await admin.from('redemptions').insert({ user_id: user.id, code_id: code.id })
    }

    const { error } = await admin
      .from('profiles')
      .update({
        plan: 'premium',
        plan_source: isEnvCode ? 'founder' : 'redeem',
        plan_expires_at: null,
      })
      .eq('id', user.id)

    if (error) return { ok: false, message: 'Could not unlock premium. Try again.' }

    return {
      ok: true,
      plan: 'premium',
      message: isEnvCode ? 'Founder access unlocked. Welcome aboard.' : 'Premium unlocked.',
    }
  })
