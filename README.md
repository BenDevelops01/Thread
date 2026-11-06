# Thread

A web front end for local models and coding agents. Run a model, follow real output, approve or deny supported agent operations, and inspect an execution log. There is no manual task-board workflow.

## Connect your machine

Requires Node.js 22.6+ and a checkout of this repository. Start the bridge from the project directory you want agents to access, or set `THREAD_AGENT_ROOT` explicitly.

```sh
npm ci
cp .env.bridge.example .env.bridge.local
# Add only the local provider credentials you use; this file is ignored by Git.
npm run bridge -- --origin YOUR_THREAD_WEBSITE_ORIGIN
```

Open Thread, sign in, select **Connections**, and paste the private pairing key printed in the terminal. The bridge listens only on loopback port 8787, accepts the configured website origin and requires that key on every request. Your browser may ask for local-network access. Restarting the bridge invalidates the old pairing key. Successful pairing is remembered in session storage for the signed-in account in the current browser tab, so a refresh reconnects automatically. Sign-out or Disconnect removes that saved pairing. Each workspace tab remains usable while disconnected and explains which connection it needs.

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
