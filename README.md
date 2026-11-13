# Thread

A friendly AI companion with four selectable buddies. Use your signed-in official Codex CLI on Mac, or bring an OpenAI or Anthropic API key, then explain confusing text, rewrite a thought or brainstorm your next step. Keys are encrypted in Supabase Vault. Free includes 20 requests per UTC day; Pro is A$10/month with no daily Thread quota. Provider API usage is billed separately.

Download the native Apple-silicon **Mac beta** at `/mac`. It includes a separate floating pet, six-step onboarding, a floating voice bubble, on-device speech where supported, explicit screenshot analysis and approval-based screen/window/text actions. Closing Settings keeps the pet running. This build is ad-hoc signed and **not notarized**; the download page explains installation and limitations. Email sign-in only. A browser companion remains at `/app`.

Native source and build instructions: [`desktop/README.md`](desktop/README.md).

See **Thread Buddy (current product)** below for architecture, billing and deployment details. The following bridge documentation applies only to the preserved `/app/legacy` workspace.

## Legacy workspace: connect your machine

Requires Node.js 22.6+ and a checkout of this repository. Start the bridge from the project directory you want agents to access, or set `THREAD_AGENT_ROOT` explicitly.

```sh
npm ci
cp .env.bridge.example .env.bridge.local
# Add only the local provider credentials you use; this file is ignored by Git.
npm run bridge -- --origin YOUR_THREAD_WEBSITE_ORIGIN
```

Open Thread, sign in, select **Connections**, and paste the private pairing key printed in the terminal. The bridge listens only on loopback port 8787, accepts the configured website origin and requires that key on every request. Your browser may ask for local-network access. Restarting the bridge invalidates the old pairing key. Pairing uses tab storage by default. Opting into **Remember this Mac** saves the pairing key in local browser storage scoped to your account, so new tabs and subsequent sign-ins reconnect. Sign-out clears active in-memory access but retains this explicit device preference. **Disconnect & forget this device** removes the saved key. The OpenAI API key stays only in the bridge environment. Each workspace tab remains usable while disconnected and explains which connection it needs.

### Models

For LM Studio, load a text model and start its Developer API server (default loopback port 1234). Ollama uses loopback port 11434. The bridge also supports OpenAI, Anthropic and Gemini using optional `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` in its local environment. Model discovery and generation happen through the bridge. Keys are never uploaded to Thread. Cloud providers receive content only when you select them.

### Codex

Install and authenticate the official Codex CLI, or configure its API key locally according to the provider's instructions. `CODEX_BIN` can specify the executable. Thread launches `codex app-server`, initializes its protocol, creates a workspace-restricted thread and starts a turn. Command and file-change approval requests appear in **Approvals**. Decisions are one-use; unsupported interactions fail closed. Existing unrelated desktop and CLI chats are not taken over.

Protocol: [official Codex app-server documentation](https://developers.openai.com/codex/app-server).

### Claude Code

Install and authenticate Claude Code locally, or configure `ANTHROPIC_API_KEY`. `CLAUDE_BIN` can specify the executable. Thread launches the CLI with structured output and a per-run `PreToolUse` hook. That hook blocks until you approve or deny the tool request from Thread. Timeout, cancellation or bridge failure denies it. Agent-specific policy and permission checks can still reject an approved tool.

Hooks: [official Claude Code hooks reference](https://code.claude.com/docs/en/hooks).

### Workspace and execution safety

Start runs with a directory inside `THREAD_AGENT_ROOT` (default bridge working directory). Symlink escapes are rejected. Codex requests workspace-write sandboxing and untrusted approval policy. Claude Code retains its CLI permission system; Thread does not pass bypass-permissions flags. Approvals expire after five minutes. Stop a run from its output panel. This is an early integration, not a guarantee that generated code or commands are safe. Only connect a trusted browser and review requested operations.

## Output and logs

- Live runs show status and real output, with no fabricated percentage.
- Agent prompts, output, event timelines, commands, file-change reports and approval decisions are stored under local `.thread-data/agents` with restricted file permissions.
- The latest 20 model runs are saved under `.thread-data/models`; older model results are removed as new runs arrive.
- Restarted in-progress runs are marked interrupted; Thread does not silently resume agent execution.
- **Logs & shipped** shows reported events and exports JSON. A successful run is not proof that code was deployed. Inspect the actual artifacts and commands.
- Logs can contain sensitive project content. They remain on your machine until deleted. Do not commit them.

The existing cloud account backend stores preferences, plan entitlement and legacy task/webhook records. This release does not delete historical account data. Current model and agent runs use local storage rather than a cloud task board.

## Web development

```sh
cp .env.example .env.local
# Fill server variables using your own backend configuration.
npm run dev
npm test
npm run check:public
npm run build
```

UI port: 8746. API dev server: 8747. Build output: `web/dist`. Vercel uses `vercel.json` at repository root. Public routes include support, contact, careers, privacy, terms, Discord and the Mac-coming-soon page. No Mac release date or open job position is advertised.

Supabase migrations and Edge Functions are in `supabase/`. The private runtime configuration holds the application origin; supply it before deploying auth. The browser uses an allowlisted same-origin proxy, forwarding the user's JWT and a publishable key, never an administrative key. Owner-scoped RLS protects account records. Sign-in allows ten attempts per email per 15-minute window.

Stripe checkout and billing portal use deployment-only server variables. Existing complimentary Pro codes are validated atomically against private hashes; real codes never belong in source. Provider costs are separate from Thread subscriptions. Public source cleanup does not erase historical Git commits; deployment-specific configuration and credentials belong outside the repository.

## Verification

`npm test` covers bridge authentication, origin isolation, model execution with a local fixture, webhook status delivery, Codex protocol handling, one-use approval denial, workspace boundaries, Claude blocking-hook cancellation and persisted logs. Fixture tests do not claim a paid model run, a live Claude installation or a deployment. Live provider execution requires the user's configured CLI/model and credentials.

## Credits

React, Vite, Supabase, Lucide and Inter. Provider silhouettes are Lobe Icons; GitHub's mark is from Simple Icons (CC0). Marks remain their respective owners' trademarks. Thread uses its own content and brand assets. See `web/public/providers/NOTICE.md`.

## Thread Buddy (current product)

Thread is now a BYO-key AI companion. `/app` opens the browser buddy; the previous bridge console remains at `/app/legacy`. The native Mac beta is downloadable from `/mac`; beta and non-notarized status are clearly labelled.

- Four original SVG characters: Bruno, Pip, Byte and Miso.
- OpenAI Responses and Anthropic Messages connections; server-side key validation and encrypted Supabase Vault storage.
- Free: 20 requests per UTC day. Pro: no daily quota, A$10/month for new subscriptions. Provider charges, message size limits and a 30-request/minute abuse limit apply to both tiers.
- Browser conversations live in tab memory; native conversations live in process memory. With Remember this Mac enabled, the native session is encrypted in user-only Application Support files and refreshed on launch; sign-out removes it. Provider keys remain in Vault. The native app shares a previewed one-shot JPEG only for the next submitted question, including with the local official Codex CLI. No continuous screen capture. Voice is active only after starting a conversation; Apple speech-service fallback is optional and off by default.
- Keys can be replaced or deleted. Secret deletion also occurs when the owner account is deleted. Raw keys are never returned by the API.
- `/api/billing` resolves the new Stripe price by lookup key `thread_buddy_pro_monthly_aud`; existing subscriptions are preserved. Webhooks recognise both the previous configured price and the buddy price.
- Premium codes use the existing single-use hashed redemption mechanism. Generate codes outside source control; never commit plaintext codes or keys.

### React Bits attribution

The landing page uses Magnet, TiltedCard, RotatingText and AnimatedContent from [React Bits](https://reactbits.dev/). Vendored source and its MIT + Commons Clause license are in `web/src/reactbits/`. These components enhance the Thread product; they are not sold as a component library.

### Backend rollout

Apply `20261107082716_buddy_companion.sql`, deploy `thread-buddy` with `_shared/common.ts`, then deploy the frontend/API. Vault must already be enabled. Provider/usage RPCs are executable only by service role; the Edge Function validates the caller through Supabase Auth before invoking them. Never expose the service-role key or grant clients access to Vault.

### Verified beta limits

The existing OpenAI key was validated and stored via the live Vault flow, but an actual model request returned `credit_balance_exhausted` / `insufficient_quota`. Thread now reports that billing issue and restores the request allowance. The actual native Swift model completed sign-in, authenticated quota reservation, a real Codex subscription conversation and a validated window-action preview without an API key. The native beta now supports that subscription path; API-key requests still require available provider credit. Microphone, screen capture and Accessibility actions require user-granted permissions; unsupported languages/apps report actionable errors.

### Mac beta 0.9.0

The floating buddy has separate voice and text controls. Its conversation bubble uses native Liquid Glass on macOS 26+, with a system material fallback on macOS 14–15 and solid surfaces when Reduce Transparency is enabled. The mic inside the prompt dictates a draft without sending; the waveform control starts a conversational voice session. Switching modes preserves an unfinished typed draft. Replying speech still uses the local neural engine.

Release checks and current distribution limitations: [desktop/RELEASE-CHECKS.md](desktop/RELEASE-CHECKS.md).
