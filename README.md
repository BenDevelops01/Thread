# Thread

A workspace for AI work that is happening in more than one place.

Thread brings model runs, progress updates and tasks that need your attention into one dashboard. Run a local model through LM Studio, connect Ollama, or configure your own OpenAI, Anthropic or Google Gemini account in a local companion. Existing scripts can report progress through authenticated webhooks.

## What works

- Private task tracking, project filters and an attention inbox.
- Local bridge: model discovery, text generation, cancellation and workspace status updates.
- LM Studio and Ollama on loopback; optional cloud-provider adapters with credentials kept in your bridge environment.
- Light, dark and system appearance; saved account preferences.
- Stripe subscription checkout and billing portal when deployment configuration is provided.
- Single-use, server-verified complimentary Pro codes, stored as hashes.
- Interactive landing-page playground with draggable windows and a sample agent handoff.

Thread does not remotely control arbitrary coding-agent sessions. The landing playground is a labelled simulation; the Connections panel runs real models. Provider support is API-based and requires a compatible text model and your own provider access. No provider affiliation is implied.

## Local models

Requires Node.js 22.6 or newer and a local checkout of this repository.

1. In LM Studio, load a text model, open **Developer**, and start its API server. The bridge defaults to loopback port 1234. Ollama defaults to port 11434.
2. In Thread, open **Connections** and copy its bridge-start command.
3. Run that command from this checkout. For example, supply your website origin as the final argument:

```sh
node connectors/local-bridge.mjs --origin YOUR_THREAD_ORIGIN
```

4. Copy the private pairing token printed in the terminal into Thread's pairing form. Keep the terminal running. Your browser may request local-network permission.
5. Choose a provider and a model, enter a task, and run it. Signed-in runs create a saved task and use a revocable connection token for updates. The demo can run a real model without creating a cloud task.

The companion listens only on loopback port 8787, accepts only the configured website origin, and requires its randomly generated pairing token. That token expires when the process stops. Local prompts and results stay between your browser and the companion; cloud providers receive requests only when you select them. Only task titles and status messages are synced to Thread.

### Optional providers

Copy `.env.bridge.example` to `.env.bridge.local` and fill only what you use. This file is ignored by Git. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` are optional. LM Studio needs no cloud key; if its server requires authentication, set `LM_STUDIO_API_TOKEN` locally.

```sh
npm run bridge -- --origin YOUR_THREAD_ORIGIN
```

Provider keys are read by the companion process and are never sent to Thread's website. Do not paste them into task descriptions or publish your environment file. The companion supports text generation; tool execution, image generation and autonomous computer control are outside its scope.

## Develop the web app

```sh
npm ci
cp .env.example .env.local
# Fill the server configuration in .env.local using your own project values.
npm run dev
```

The local UI uses port 8746 and its API server uses port 8747. `npm run build` creates `web/dist`. Vercel uses the repository root and `vercel.json`; configure the same server variables in its environment settings.

The browser talks to a same-origin proxy. The deployment-specific backend address and publishable key are supplied on the server, not embedded in frontend source. The proxy forwards a user's JWT and a publishable key, never an administrative key, and permits only the application's required routes. Authentication is still enforced by Supabase and row-level security.

## Backend setup

Create a Supabase project, apply the SQL migrations in order and deploy the functions in `supabase/functions`. Functions use the platform's server-side environment. The `runtime_configuration` migration creates a private configuration table: an administrator must set `site_origin` to the deployed website origin. Set the same origin in Supabase Auth's allowed email redirects.

All public workspace tables have owner-scoped RLS. Subscription and premium-grant writes are restricted to server functions. Rate-limit and redemption-code tables are private. Sign-in allows 10 attempts per account per 15-minute window; redemption also has attempt limits; direct platform authentication also needs its own platform-level protections.

## Billing

Configure the Stripe and signed-backend variables listed in `.env.example`. Supply your own recurring price ID. The webhook handler reconciles signed subscription events and handles refund, dispute and fraud-warning events. The billing portal supports cancellation. Configure Stripe's webhook at your deployment's `/api/stripe-webhook` endpoint and review tax registrations before accepting payments.

Access codes are cryptographically generated outside the source tree. Only SHA-256 hashes are stored privately. Redemption is atomic, authenticated and rate-limited. A successful code grants the same server-enforced Pro limits as a subscription. Never put an actual access code into a migration, source file or public environment variable.

## Verification

```sh
npm test
npm run check:public
npm run build
```

The unit/integration suite uses a local fixture to verify pairing, origin restrictions, model execution and task-status delivery without paid API calls. Live database tests in `tests/redemption.mjs` and `tests/integration.mjs` require disposable test accounts and server configuration; they accept test inputs through stdin. Never use a real customer's access code for tests.

## Repository hygiene

This repository stays public. Deployment-specific keys, backend endpoints, price IDs and private codes belong in environment configuration or private backend storage. Public documentation links, standard provider API addresses, loopback defaults and package-registry URLs are intentional. Old commits may still contain historical public configuration; cleaning the current tree does not erase Git history or revoke anything already copied.

The obsolete Mac app, old downloads and unused UI have been removed from the current source tree. No production credentials are needed to clone, build or run the fixture tests.

## Credits

Thread uses React, Vite, Lucide and Supabase. Provider logo silhouettes are from Lobe Icons; vendor trademarks belong to their respective owners. See `web/public/providers/NOTICE.md` for attribution. The landing page's desktop-inspired presentation uses Thread's own artwork and interface content.
