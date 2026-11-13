# Thread 0.9.0 beta release checks

Date: 13 November 2026 (Australia/Sydney).

## Scope

Native Apple-silicon Mac app, website, authentication boundary, local voice modes, desktop action validation and downloadable installer. The prior Remotion marketing project is unchanged and excluded from this release.

## Completed checks

- Release-mode native compilation with native Liquid Glass guarded by macOS 26 availability; macOS 14–15 use a system material fallback. Reduce Transparency uses an opaque surface and Reduce Motion disables waveform movement.
- `desktop/scripts/test-voice.sh`: dictation appends to the existing draft without sending or making an API request; a stopped voice session restores an unsent text draft; a late microphone-permission result cannot restart a stopped recording.
- `desktop/scripts/test-actions.sh`: rejects shell operations, non-HTTPS/credential-bearing URLs, invalid coordinates, invalid scroll amounts, unsupported layouts and empty text insertion; checks screenshot staleness and legacy token expiry.
- Existing 12 Node tests: bridge authentication, origin isolation, account-scoped remembered pairing, denied/one-use approvals, allowed proxy routes and model-server failure recovery.
- Website production build and desktop/phone/tablet checks, light/dark themes, example dictation, prompt submission and voice preview. These website interactions are explicitly labelled demonstrations and do not access a microphone, screen or model provider.
- Production dependency audit: no known production vulnerabilities reported by npm at the time of this check. This is a dependency check, not a penetration test.
- Public-source scan: no recognized provider secrets, private backend endpoints, private keys or redemption codes in tracked/unignored source.
- Live unauthenticated checks: billing readiness responds 200; buddy status without a session responds 401; direct administrative RPC proxy path responds 404. No checkout or subscription change was performed.
- Packaged app: deep/strict signature validation, identifier/version checks, arm64 and actual Mach-O minimum macOS version checks, bundled neural runtime and no environment files in the installer.

## Distribution status

This is an **ad-hoc signed beta**, not an Apple-notarized stable release. This Mac has no Developer ID signing identity. Developer ID signing and Apple notarization are required before a frictionless public Mac release can be claimed. The download page and installer retain the beta/not-notarized notice. Updates can require macOS privacy permissions to be granted again for the changed ad-hoc build.

Strix testing was not performed: the connector required reauthentication, and the user explicitly asked to skip Strix. The checks above do not establish that the app is free of security vulnerabilities.

Provider API costs and Codex subscription limits remain separate from Thread's Free/Pro entitlement. API keys stay in Supabase Vault. Remember this Mac encrypts the native session in user-only local files; an attacker already controlling the macOS account can access the local encryption key. No Keychain integration was added.
