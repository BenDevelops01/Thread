# Thread 0.3.0

A React interface for your AI providers, packaged in a native macOS shell. The download website lives at https://trythread.xyz. Support: support@trythread.xyz.

## Develop

```sh
npm ci
npm run dev
```

## Build, test, and package

```sh
npm run build
npm test
npm run package:mac
```

`web/` contains the React website and desktop interface. `desktop/` contains the Swift native bridge, direct streaming provider clients, local workspace storage, Keychain access, and DMG packaging. The desktop interface is bundled into one HTML file. Its Content Security Policy permits network connections only to the existing Thread Supabase project for accounts and notes. AI provider requests stay in the native layer. The native bridge accepts messages only from the bundled main frame. External clicked HTTPS and email links open in the default system app.

The neutral graphite palette replaces the previous purple treatment. The original Thread handwritten mark is reused from this repository's prior website. React Bits components: BranchedMenu, PromptBar, CallChip, LatticeLoader, ThoughtLine, SpotlightCard, and BlurText. Adaptations include controlled state, real model callbacks, truthful request activity, and prompt-library actions. Third-party notices and licences are in `web/public/third-party-notices.txt` and bundled inside the Mac app.

## Current features

Eight provider presets plus custom OpenAI-compatible/Anthropic endpoints; streaming text; saved and searchable local conversations; branched navigation; model search and favorites; prompt library and slash commands; focus mode; per-thread instructions; copy; regenerate; and Markdown export. The website contains an explicitly labelled sample preview, privacy policy, terms, support, and changelog pages.

## Release limits

Apple silicon and macOS 14+. Supabase email/password sign-in, onboarding, private cloud notes, autosave, and local per-account note-draft recovery are included. Sessions are stored in Keychain. The current DMG is ad-hoc signed, not Developer ID signed or notarized. Gatekeeper may block downloaded copies. For normal public distribution, install a Developer ID identity, set `THREAD_SIGNING_IDENTITY`, then notarize and staple the signed artifact before publication. Update the early-access notices after notarization. AI requests have been exercised against a local fixture; real paid-provider requests require the user's keys. Live Supabase sign-in, profile/notes operations, and row ownership isolation were verified with synthetic QA accounts. Images, voice, attachments, model tool execution, automatic updates, and Intel builds are not included. Call chips show real native chat/model-list requests; Thought Line displays request progress, not inferred model reasoning.

Chat history is stored locally at `~/Library/Application Support/Thread/workspace.json` and is not encrypted by Thread. Keys are stored in macOS Keychain under `xyz.trythread.mac.provider-keys`. Switching providers shares existing thread history with the new provider on the next send. Provider policies and billing apply.

## Deployment

The root Vercel configuration builds `web/dist`. The production project is `thread` under `ben-develops1`; the production branch is `main`. The Mac package is distributed through `web/public/downloads/` with a SHA-256 file. Replace both when updating the release. Never place API keys, credentials, or `.env` files in the repository or client bundle.
