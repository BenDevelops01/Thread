import Foundation
import Security
import LocalAuthentication

enum APIKind: String, Codable, CaseIterable {
    case compatible = "OpenAI compatible"
    case anthropic = "Anthropic Messages"
}

struct Provider: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var detail: String
    var symbol: String
    var color: String
    var baseURL: String
    var kind: APIKind = .compatible
    var models: [String] = []
    var selectedModel: String = ""
    var enabled = false
    var isCustom = false
    var requiresKey = true

    static let presets: [Provider] = [
        .init(id: "openai", name: "OpenAI", detail: "GPT models", symbol: "sun.max", color: "D5E5DC", baseURL: "https://api.openai.com/v1"),
        .init(id: "anthropic", name: "Anthropic", detail: "Claude models", symbol: "asterisk", color: "DCA88B", baseURL: "https://api.anthropic.com/v1", kind: .anthropic),
        .init(id: "google", name: "Google", detail: "Gemini models", symbol: "sparkles", color: "AAC2F1", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai"),
        .init(id: "openrouter", name: "OpenRouter", detail: "One key, many models", symbol: "arrow.triangle.branch", color: "C4B4ED", baseURL: "https://openrouter.ai/api/v1"),
        .init(id: "deepseek", name: "DeepSeek", detail: "DeepSeek models", symbol: "water.waves", color: "91B5E9", baseURL: "https://api.deepseek.com"),
        .init(id: "groq", name: "Groq", detail: "Fast inference", symbol: "bolt", color: "EDB19A", baseURL: "https://api.groq.com/openai/v1"),
        .init(id: "xai", name: "xAI", detail: "Grok models", symbol: "xmark", color: "DCDCDC", baseURL: "https://api.x.ai/v1"),
        .init(id: "ollama", name: "Ollama", detail: "Models on your Mac", symbol: "desktopcomputer", color: "C1C5CD", baseURL: "http://localhost:11434/v1", requiresKey: false)
    ]
}

struct Message: Identifiable, Codable, Equatable {
    var id = UUID()
    var role: String
    var content: String
    var model: String? = nil
    var providerName: String? = nil
    var interrupted = false
}

struct Conversation: Identifiable, Codable, Equatable {
    var id = UUID()
    var title = "New thread"
    var createdAt = Date()
    var updatedAt = Date()
    var providerID: String = "openai"
    var model = ""
    var systemPrompt = ""
    var messages: [Message] = []
}

struct AppData: Codable {
    var providers: [Provider] = Provider.presets
    var conversations: [Conversation] = []
    var defaultProviderID = "openai"
    var defaultSystemPrompt = ""
}

enum ThreadError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self { case .message(let text): return text }
    }
}

enum KeyVault {
    private static let service = "xyz.trythread.mac.provider-keys"
    static func read(_ id: String, allowInteraction: Bool = true) throws -> String? {
        var query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: id,
            kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        if !allowInteraction { let context = LAContext(); context.interactionNotAllowed = true; query[kSecUseAuthenticationContext as String] = context }
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound || (!allowInteraction && status == errSecInteractionNotAllowed) { return nil }
        guard status == errSecSuccess, let data = result as? Data else {
            throw ThreadError.message("Could not read the API key from Keychain (\(status)).")
        }
        return String(data: data, encoding: .utf8)
    }
    static func write(_ value: String, for id: String) throws {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: id]
        let data = Data(value.utf8)
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var item = query
            item[kSecValueData as String] = data
            item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            let addStatus = SecItemAdd(item as CFDictionary, nil)
            guard addStatus == errSecSuccess else { throw ThreadError.message("Could not save the API key to Keychain (\(addStatus)).") }
        } else if status != errSecSuccess { throw ThreadError.message("Could not update Keychain (\(status)).") }
    }
    static func delete(_ id: String) throws {
        let status = SecItemDelete([kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: id] as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw ThreadError.message("Could not remove the key from Keychain (\(status)).")
        }
    }
}

struct DiskStore {
    let url: URL
    init(directory: URL? = nil) {
        let folder = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Thread", isDirectory: true)
        url = folder.appendingPathComponent("workspace.json")
    }
    func load() throws -> AppData {
        guard FileManager.default.fileExists(atPath: url.path) else { return AppData() }
        return try JSONDecoder().decode(AppData.self, from: Data(contentsOf: url))
    }
    func save(_ data: AppData) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        let encoded = try JSONEncoder().encode(data)
        try encoded.write(to: url, options: .atomic)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }
}
