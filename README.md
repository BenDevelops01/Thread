# Thread — keep your agents moving

Early-access web app: a lively marketing site, sample dashboard, Supabase accounts, owner-scoped task tracking, attention inbox, revocable webhook connections and Stripe Pro integration.

## Run

`npm ci` then `npm run dev`. Production: `npm run build`; output `web/dist`. Vercel uses the repository root and the tracked `vercel.json`.

## Backend

Project reference: `kytcrsxywqrxcqpembpp`. Only its public publishable key is used in browser code. Service-role keys are read from Supabase's server environment; never commit secret keys.

Migration: `supabase/migrations/20261106100302_agent_workspace.sql`. Functions: `thread-auth`, `thread-connect`, `thread-events`, `thread-billing`, `thread-stripe-webhook`.

The auth endpoint enforces 10 attempts per 15-minute window per hashed email and proxy network identifier. It fails closed if the limiter fails. This protects the Thread endpoint; Supabase's direct Auth API also needs platform-level rate limits/CAPTCHA configuration. Do not claim the wrapper prevents all direct Auth API attacks. Production email confirmation redirects must allow `https://trythread.xyz/app` in Supabase Auth settings.

All agent tables use RLS. Subscription writes are server-only. Connection hashes are not selectable by browser clients. Task counts and connection limits are enforced in database triggers. Webhook events accept 60 updates per connection per minute. No provider API keys are requested. Existing legacy tables are retained empty.

## Stripe billing

Vercel API routes use the existing server-only `STRIPE_SECRET_KEY`. A separate `THREAD_STRIPE_WEBHOOK_SECRET` verifies the new Stripe webhook at `https://trythread.xyz/api/stripe-webhook`. The `THREAD_BACKEND_SECRET` signs requests to a Supabase Edge Function; its counterpart is encrypted in Supabase Vault and exposed only to service-role code. No server secrets are included in browser code or source control.

Product `prod_VZtcgjXC8Bq66k`; price `price_1UYjphL9PeXTq9CWPw0a6VAa`: AUD 15/month. Signed lifecycle events reconcile entitlements, with event-order checks. Refund, dispute and fraud warning events suspend access for review. No purchase is made during setup. Tax-inclusive pricing does not configure Stripe Tax: review registrations and tax settings before broader sales.

The older `thread-billing` and `thread-stripe-webhook` Edge Functions remain disabled unless their independent Stripe secrets and enable flag are supplied; the web app uses `/api/billing` and `/api/stripe-webhook` on Vercel.

## Current scope

Generic webhook updates and manual task management work. Native coding-app integrations, remote control, push notifications and historical event timelines are not included. The activity view shows the latest update per task. The old Mac source remains in the repository for reference and is not used by the new website.

## Verification

`npm run build`; `python3 tests/backend-smoke.py` (performs 11 invalid sign-in attempts and tests unauthenticated request rejection without creating an account). Database ownership isolation was tested in a rolled-back transaction. Run the smoke test only when ready to consume the network's 15-minute sign-in quota.
