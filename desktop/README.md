# Thread native layer

Build the React interface from the repository root with `npm ci && npm run build`, then run `npm run package:mac`.

Swift handles direct provider requests, Keychain storage for API keys and the Supabase session, local chat persistence, and the secure bundled-WebKit bridge. Supabase Auth and private notes are implemented in `web/src/Cloud.jsx` and use the existing Thread Supabase project. Only the public project URL and publishable key are bundled. Session values never enter the workspace JSON or Git repository.

The UI coalesces streaming snapshots at 60 ms intervals and memoizes/defer-renders Markdown. Chat scrolling follows replies only when the reader is near the bottom. Provider keys and local chats are preserved from earlier versions.

Run `npm test` for 31 native request/storage/streaming checks. The cloud flow was additionally verified against the live Thread project using synthetic QA accounts: password sign-in, onboarding, note insertion/update/reload, and cross-user read/write isolation. Test notes were removed and sessions signed out. QA auth identities require project-admin cleanup; their IDs are recorded only in the development workspace, without passwords or session tokens.

This Apple silicon/macOS 14+ build is ad-hoc signed. Apple Developer ID signing and notarization remain required for normal distribution. Current provider support is text chat; model tool execution, files, images, voice, Intel builds, and automatic updates are not included.
