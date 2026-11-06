# Thread — keep your agents moving

Early-access web app: a lively marketing site, sample dashboard, Supabase accounts, owner-scoped task tracking, attention inbox, revocable webhook connections and Stripe Pro integration.

## Run

`npm ci` then `npm run dev`. Production: `npm run build`; output `web/dist`. Vercel uses the repository root and the tracked `vercel.json`.

## Backend

Project reference: `kytcrsxywqrxcqpembpp`. Only its public publishable key is used in browser code. Service-role keys are read from Supabase's server environment; never commit secret keys.

Migration: `supabase/migrations/20261106100302_agent_workspace.sql`. Functions: `thread-auth`, `thread-connect`, `thread-events`, `thread-billing`, `thread-stripe-webhook`.

The auth endpoint enforces 10 attempts per 15-minute window per hashed email and proxy network identifier. It fails closed if the limiter fails. This protects the Thread endpoint; Supabase's direct Auth API also needs platform-level rate limits/CAPTCHA configuration. Do not claim the wrapper prevents all direct Auth API attacks. Production email confirmation redirects must allow `https://trythread.xyz/app` in Supabase Auth settings.

All agent tables use RLS. Subscription writes are server-only. Connection hashes are not selectable by browser clients. Task counts and connection limits are enforced in database triggers. Webhook events accept 60 updates per connection per minute. No provider API keys are requested. Existing legacy tables are retained empty.

## Stripe setup still required

Connected account: Thread. Product `prod_VZtcgjXC8Bq66k`; Pro monthly price `price_1UYjphL9PeXTq9CWPw0a6VAa` (AUD 15, tax-inclusive price setting). Checkout remains disabled until all these server secrets are configured:

- `STRIPE_SECRET_KEY` (prefer a restricted key with the required customer, checkout, portal, subscription and charge permissions)
- `STRIPE_WEBHOOK_SECRET`
- `THREAD_BILLING_ENABLED=true`

Configure the Stripe webhook at `https://kytcrsxywqrxcqpembpp.supabase.co/functions/v1/thread-stripe-webhook` for checkout.session.completed, checkout.session.async_payment_succeeded, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed, charge.dispute.created, charge.refunded and radar.early_fraud_warning.created. Enable the customer portal. Verify the integration in a Stripe sandbox before enabling live checkout. Taxes: confirm registrations and appropriate tax setup before charging customers; setting a tax-inclusive price does not configure Stripe Tax.

Entitlements are reconciled from signed webhook events, never from the success redirect. Risk events suspend entitlements for review. No purchase has been made as part of setup.

## Current scope

Generic webhook updates and manual task management work. Native coding-app integrations, remote control, push notifications and historical event timelines are not included. The activity view shows the latest update per task. The old Mac source remains in the repository for reference and is not used by the new website.

## Verification

`npm run build`; `python3 tests/backend-smoke.py` (performs 11 invalid sign-in attempts and tests unauthenticated request rejection without creating an account). Database ownership isolation was tested in a rolled-back transaction. Run the smoke test only when ready to consume the network's 15-minute sign-in quota.
