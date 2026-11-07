# Thread Beta for Mac

A native SwiftUI/AppKit desktop companion, not a browser shell. A transparent NSPanel hosts the pet across Spaces, independently of the conversation window. Closing the conversation keeps the process and pet running. A menu bar item and Option-Command-Space summon the conversation.

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

- Four animated native pets, draggable positioning, optional active-window following, menu bar controls and background lifecycle.
- Email/password account auth through the existing rate-limited Supabase endpoint. Refresh tokens stay in process memory; provider API keys remain encrypted in Supabase Vault.
- Codex subscription connection through the installed official CLI using its own ChatGPT login. No Codex token files are read or copied. Each turn uses an ephemeral isolated directory, read-only sandbox, ignored user config, and disabled shell/unified execution tools. Responses are parsed from JSONL events. Generated desktop action plans still need individual native approval. Codex plan limits apply.
- Native conversation UI, shared text preview, native speech synthesis and Apple on-device dictation when the device/language supports it.
- Selected text through Accessibility, or one-shot screen capture processed locally with Vision OCR. Only the reviewed text is sent on submission.
- Action planning through the chosen BYO provider, followed by a separate approval for each supported action: resize/reposition the remembered target app’s window, open an HTTPS link, insert text into a supported selected text field. Password subroles are rejected. No shell execution, autonomous clicking or automatic form submission.
- Stripe Checkout/portal and complimentary code redemption using the same account and entitlements as the website.

## Permissions

The pet’s basic positioning needs no Accessibility permission. Window actions and selected text need Accessibility. One-shot screen OCR requests Screen Recording only when invoked. Dictation requests Microphone and Speech Recognition only when started, requires on-device support, stops after 55 seconds and is stopped explicitly when the conversation closes. Screen and microphone content are never collected continuously.

## Account sign-in

Email/password sign-in is supported. Social sign-in has been removed.

## Beta limitations

No notarization, Intel build, automatic update service or persistence of login/conversation across app quits. On-device dictation depends on language support. Some apps disallow window resizing or safe text insertion. Context is selected text/OCR, not continuous vision. Agent planning can be wrong: each suggested action is reviewable and validated before execution. This is not a general autonomous computer-use agent.

## Optional live flow check

`Tests/NativeFlowCheck.swift` exercises the actual native model: email sign-in, authenticated request reservation, Codex subscription inference and validated action planning. It never approves the generated action. Compile it with `Model.swift` and `CodexSubscription.swift`, then provide `THREAD_TEST_EMAIL` and `THREAD_TEST_PASSWORD` for a disposable test account via the environment. It uses two requests from that account and the locally signed-in Codex allowance. Do not embed credentials in source.
