import Foundation

func check(_ condition: @autoclosure () -> Bool, _ label: String) throws {
    guard condition() else { throw ThreadError.message("FAILED: \(label)") }
}
func mustThrow(_ label: String, _ operation: () throws -> Void) throws {
    do { try operation() } catch { return }
    throw ThreadError.message("FAILED: \(label) did not reject invalid input")
}
@main struct Checks {
    @MainActor static func main() async throws {
        var count = 0
        var provider = Provider.presets[0]
        for url in ["http://evil.example/v1", "https://key@example.com/v1", "https://example.com/v1?key=secret", "https://example.com/v1#secret", "file:///tmp/api"] {
            provider.baseURL = url
            try mustThrow("Unsafe endpoint") { _ = try ProviderClient.endpoint(provider, path: "models") }; count += 1
        }
        provider.baseURL = "http://localhost:11434/v1/"
        let url = try ProviderClient.endpoint(provider, path: "chat/completions")
        try check(url.absoluteString == "http://localhost:11434/v1/chat/completions", "Local endpoint normalization"); count += 1
        let history: [Message] = [.init(role: "user", content: "Hello"), .init(role: "assistant", content: "Hi")]
        for preset in [Provider.presets[0], Provider.presets[1]] {
            let req = try ProviderClient.chatRequest(provider: preset, key: "test-only", model: "fixture-chat", systemPrompt: "Be concise", messages: history)
            let body = try JSONSerialization.jsonObject(with: req.httpBody!) as! [String: Any]
            let rows = body["messages"] as! [[String: String]]
            try check(req.value(forHTTPHeaderField: "Authorization") == "Bearer test-only", "Authorization header")
            try check(body["stream"] as? Bool == true, "Streaming enabled")
            if preset.kind == .anthropic {
                try check(body["system"] as? String == "Be concise", "Anthropic system")
                try check(body["max_tokens"] as? Int == 8192, "Anthropic token limit")
                try check(rows.count == 2 && req.url?.path == "/v1/messages", "Anthropic route/history")
            } else { try check(rows.first?["role"] == "system" && rows.count == 3, "Compatible system/history") }
            count += 1
        }
        let text = try ProviderClient.decodeEvent(#"{"choices":[{"delta":{"content":"Hello 🌏"},"finish_reason":null}]}"#, kind: .compatible)
        try check(text.text == "Hello 🌏", "Unicode stream"); count += 1
        let end = try ProviderClient.decodeEvent("[DONE]", kind: .compatible)
        try check(end.finished, "DONE marker"); count += 1
        let anthropic = try ProviderClient.decodeEvent(#"{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}"#, kind: .anthropic)
        try check(anthropic.text == "Hi", "Anthropic delta"); count += 1
        let stop = try ProviderClient.decodeEvent(#"{"type":"message_stop"}"#, kind: .anthropic)
        try check(stop.finished, "Anthropic end"); count += 1
        try mustThrow("Malformed event") { _ = try ProviderClient.decodeEvent("broken", kind: .compatible) }; count += 1
        let error = try ProviderClient.decodeEvent(#"{"error":{"message":"secret-key-should-never-appear"}}"#, kind: .compatible)
        try check(error.error != nil && !error.error!.contains("secret-key"), "Provider error redaction"); count += 1
        try mustThrow("Missing key") { _ = try ProviderClient.chatRequest(provider: Provider.presets[0], key: "", model: "model", systemPrompt: "", messages: []) }; count += 1
        try mustThrow("Missing model") { _ = try ProviderClient.chatRequest(provider: Provider.presets[0], key: "test", model: " ", systemPrompt: "", messages: []) }; count += 1
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let disk = DiskStore(directory: directory)
        var data = AppData()
        data.conversations = [.init(title: "A test", messages: history)]
        try disk.save(data)
        let loaded = try disk.load()
        try check(loaded.conversations == data.conversations && loaded.providers == data.providers, "Persistence round trip")
        let attrs = try FileManager.default.attributesOfItem(atPath: disk.url.path)
        try check((attrs[.posixPermissions] as? NSNumber)?.intValue == 0o600, "Private file permissions"); count += 1
        let raw = try String(contentsOf: disk.url, encoding: .utf8)
        try check(!raw.contains("apiKey") && !raw.contains("test-only"), "Keys excluded from workspace"); count += 1

        let vaultID = "test-" + UUID().uuidString
        defer { try? KeyVault.delete(vaultID) }
        try KeyVault.write("fixture-not-a-real-key", for: vaultID)
        let storedKey = try KeyVault.read(vaultID)
        try check(storedKey == "fixture-not-a-real-key", "Keychain round trip")
        try KeyVault.write("replacement-fixture", for: vaultID)
        let updatedKey = try KeyVault.read(vaultID)
        try check(updatedKey == "replacement-fixture", "Keychain replacement")
        try KeyVault.delete(vaultID)
        let removedKey = try KeyVault.read(vaultID)
        try check(removedKey == nil, "Keychain removal"); count += 3

        let port = CommandLine.arguments[1]
        var fixture = Provider(id: "fixture", name: "Fixture", detail: "Test", symbol: "server.rack", color: "FFFFFF", baseURL: "http://127.0.0.1:\(port)/v1", requiresKey: false)
        let models = try await ProviderClient.models(provider: fixture, key: "")
        try check(models == ["fixture-chat"], "Live model discovery"); count += 1
        for kind in APIKind.allCases {
            fixture.kind = kind
            var received = ""
            try await ProviderClient.stream(provider: fixture, key: "", model: "fixture-chat", systemPrompt: "", messages: history) { received += $0 }
            try check(received == "Hello 🌏 from Thread.", "Live \(kind.rawValue) stream"); count += 1
        }
        fixture.kind = .compatible
        for model in ["truncated", "api-error", "malformed", "empty", "unauthorized"] {
            var rejected = false
            do { try await ProviderClient.stream(provider: fixture, key: "", model: model, systemPrompt: "", messages: history) { _ in } }
            catch { rejected = true }
            try check(rejected, "Live \(model) detection"); count += 1
        }
        var cancelled = false
        let cancellationFixture = fixture
        let task = Task {
            try await ProviderClient.stream(provider: cancellationFixture, key: "", model: "slow", systemPrompt: "", messages: history) { _ in }
        }
        try await Task.sleep(for: .milliseconds(100)); task.cancel()
        do { try await task.value } catch { cancelled = true }
        try check(cancelled, "Live cancellation"); count += 1
        fixture.baseURL = "http://127.0.0.1:\(port)/redirect"
        var redirectRejected = false
        do { _ = try await ProviderClient.models(provider: fixture, key: "") } catch { redirectRejected = true }
        try check(redirectRejected, "Redirect rejection"); count += 1
        print("PASS: \(count) checks, including live HTTP streaming, both API protocols, errors, cancellation, storage, and credential-safe endpoints.")
    }
}
