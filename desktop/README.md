# Thread Beta for Mac

A native SwiftUI/AppKit desktop companion, not a browser shell. A transparent NSPanel hosts the pet across Spaces, independently of Settings. Clicking the pet opens a compact voice bubble. Closing Settings keeps the process and pet running. A menu bar item and Option-Command-Space summon the buddy.

## Build and package

Requires Apple silicon and Apple’s Swift command line tools. No external Swift packages are used.

```sh
swift build --package-path desktop
./desktop/scripts/test-actions.sh
./desktop/scripts/package-beta.sh
```

The packaging script builds an arm64 release, assembles an app bundle, ad-hoc signs it, verifies that signature, creates a DMG with an Applications shortcut and installation instructions, and writes a SHA-256 manifest into `web/public/downloads`. This beta is **not Developer ID signed or notarized**. No certificate, account credential or provider key is included.

Public download: `/mac`. Only an Apple-silicon build is provided. Minimum macOS 14. Compiled on this Mac; older supported OS releases still need device testing.

## What works

- Six original pixel-art animated native pets, draggable positioning, optional active-window following, menu bar controls and background lifecycle.
- Email/password account auth through the existing rate-limited Supabase endpoint. Refresh tokens stay in process memory; provider API keys remain encrypted in Supabase Vault.
- Codex subscription connection through the installed official CLI using its own ChatGPT login. No Codex token files are read or copied. Each turn uses an ephemeral isolated directory, read-only sandbox, ignored user config, and disabled shell/unified execution tools. Responses are parsed from JSONL events. Generated desktop action plans still need individual native approval. Codex plan limits apply.
- Six-step onboarding: buddy, email account, validated Codex or encrypted API key connection, optional permissions and a real response test. Separate Settings and floating voice bubble.
- Voice turns: tap the pet/microphone, pause to send, hear native speech synthesis, then continue listening. On-device Apple recognition is the default; optional Apple speech-service fallback is off. Each listening turn stops after 55 seconds.
- Explicit one-shot ScreenCaptureKit image sharing with thumbnail preview. The next request sends the JPEG to the chosen model, including the official Codex CLI image input. No automatic next capture, image persistence or continuous recording. Non-interactive arrows/highlights guide the user.
- Action planning through the chosen BYO provider, followed by a separate approval for each supported action: resize/reposition the remembered target app’s window, open an HTTPS link, insert text into a supported selected text field. Clicks and scrolling require a recent screenshot, unchanged target/window geometry, Accessibility and individual approval. Password subroles are rejected. No shell execution or automatic form submission.
- Stripe Checkout/portal and complimentary code redemption using the same account and entitlements as the website.

## Permissions

The pet’s basic positioning needs no Accessibility permission. Window actions and selected text need Accessibility. On-demand screenshots require Screen Recording. Voice requires Microphone and Speech Recognition. These permissions can be chosen individually in onboarding or Settings. The microphone runs only during an active voice conversation; the bubble’s stop/close controls stop it. Settings can close without ending the conversation. Screenshots are never collected continuously.

## Account sign-in

Email/password sign-in is supported. Social sign-in has been removed.

## Beta limitations

No notarization, Intel build, automatic update service or persistence of login/conversation across app quits. On-device dictation depends on language support. Some apps disallow window resizing or safe text insertion. Vision is a single explicitly shared screenshot, not continuous monitoring. Agent planning can be wrong: each suggested action is reviewable and validated before execution. This is not a general autonomous computer-use agent.

## Optional live flow check

`Tests/NativeFlowCheck.swift` exercises the actual native model: email sign-in, authenticated request reservation, Codex subscription inference and validated action planning. It never approves the generated action. Compile it with `Model.swift`, `CodexSubscription.swift`, `DesktopServices.swift` and `ScreenContext.swift`, then provide `THREAD_TEST_EMAIL` and `THREAD_TEST_PASSWORD` for a disposable test account via the environment. It uses two requests from that account and the locally signed-in Codex allowance. Do not embed credentials in source.

## 0.7.0 verification

Release build and ad-hoc signature verified on this Mac. Native action validation rejects unsafe coordinates, scroll amounts, URL schemes and unsupported operations. A live official Codex image request read a synthetic screenshot and returned validated highlight coordinates. The native account/quota/conversation/action-plan test is separate from microphone, Accessibility and Screen Recording hardware checks; those require macOS permissions and user input.

`Tests/VisionFlowCheck.swift` creates a synthetic screenshot, sends it through the signed-in official Codex CLI, checks the exact heading and validates a highlight. It consumes one Codex turn and does not capture the user’s screen or execute desktop actions.

`Tests/SessionFlowCheck.swift` signs into a disposable account twice, forces an access-token refresh and verifies that local sign-out preserves the other session. Both sessions are then signed out. The live check passed against the deployed auth endpoint.
