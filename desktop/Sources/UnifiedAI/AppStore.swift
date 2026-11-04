import SwiftUI
import AppKit
import UniformTypeIdentifiers

@MainActor final class AppStore: ObservableObject {
    @Published var data = AppData()
    @Published var page = "chat"
    @Published var selectedID: UUID?
    @Published var draft = ""
    @Published var search = ""
    @Published var error: String?
    @Published var generatingID: UUID?
    @Published var selectedProviderID = "openai"
    @Published var selectedModel = ""
    @Published var editorProvider: Provider?
    @Published var showConversationSettings = false
    private var generationTask: Task<Void, Never>?
    private let disk: DiskStore
    private var storageHealthy = true

    init(disk: DiskStore = DiskStore()) {
        self.disk = disk
        do { data = try disk.load() }
        catch {
            storageHealthy = false
            self.error = "Thread couldn't read its saved workspace. The existing file has been preserved. \(error.localizedDescription)"
        }
        for preset in Provider.presets where !data.providers.contains(where: { $0.id == preset.id }) {
            data.providers.append(preset)
        }
        selectedProviderID = data.defaultProviderID
        selectedModel = data.providers.first(where: { $0.id == selectedProviderID })?.selectedModel ?? ""
        // A process can terminate while receiving a response; preserve its partial content.
        for ci in data.conversations.indices {
            if let last = data.conversations[ci].messages.indices.last,
               data.conversations[ci].messages[last].role == "assistant",
               data.conversations[ci].messages[last].content.isEmpty {
                data.conversations[ci].messages[last].interrupted = true
            }
        }
    }

    var active: Conversation? { data.conversations.first { $0.id == selectedID } }
    var provider: Provider? { data.providers.first { $0.id == selectedProviderID } }
    var connected: [Provider] { data.providers.filter(\.enabled) }
    var filteredConversations: [Conversation] {
        data.conversations.filter { search.isEmpty || $0.title.localizedCaseInsensitiveContains(search) || $0.messages.contains { $0.content.localizedCaseInsensitiveContains(search) } }
            .sorted { $0.updatedAt > $1.updatedAt }
    }
    var canSend: Bool { generatingID == nil && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && provider?.enabled == true && !selectedModel.isEmpty }

    func save() {
        guard storageHealthy else { return }
        do { try disk.save(data) }
        catch { self.error = "Your latest changes could not be saved: \(error.localizedDescription)" }
    }

    func newThread() {
        page = "chat"; selectedID = nil; draft = ""; error = nil
    }
    func select(_ conversation: Conversation) {
        selectedID = conversation.id; page = "chat"; draft = ""; error = nil
        selectedProviderID = conversation.providerID; selectedModel = conversation.model
    }
    func chooseProvider(_ provider: Provider) {
        selectedProviderID = provider.id; selectedModel = provider.selectedModel
        updateSelection()
    }
    func chooseModel(_ model: String) { selectedModel = model; updateSelection() }
    private func updateSelection() {
        if let i = data.conversations.firstIndex(where: { $0.id == selectedID }) {
            data.conversations[i].providerID = selectedProviderID
            data.conversations[i].model = selectedModel
        }
        save()
    }
    func updateProvider(_ value: Provider, key: String?) throws {
        if let key, !key.isEmpty { try KeyVault.write(key, for: value.id) }
        if let i = data.providers.firstIndex(where: { $0.id == value.id }) { data.providers[i] = value }
        else { data.providers.append(value) }
        if connected.count == 1 || selectedProviderID == value.id || provider?.enabled != true {
            selectedProviderID = value.id; selectedModel = value.selectedModel
            data.defaultProviderID = value.id
            updateSelection()
        }
        save()
    }
    func disconnect(_ provider: Provider) throws {
        try KeyVault.delete(provider.id)
        if let i = data.providers.firstIndex(where: { $0.id == provider.id }) {
            data.providers[i].enabled = false
        }
        save()
    }
    func deleteConversation(_ id: UUID) {
        if generatingID == id { cancel() }
        data.conversations.removeAll { $0.id == id }
        if selectedID == id { newThread() }
        save()
    }
    func setConversation(title: String, system: String) {
        guard let i = data.conversations.firstIndex(where: { $0.id == selectedID }) else { return }
        data.conversations[i].title = title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Untitled thread" : title
        data.conversations[i].systemPrompt = system
        save()
    }

    func send() {
        guard canSend, let provider else { return }
        error = nil
        let content = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        let key: String
        do { key = try KeyVault.read(provider.id) ?? "" }
        catch { self.error = error.localizedDescription; return }
        if provider.requiresKey && key.isEmpty { error = "Add your \(provider.name) key in Providers first."; return }
        if selectedID == nil {
            let c = Conversation(title: String(content.prefix(52)).replacingOccurrences(of: "\n", with: " "), providerID: provider.id, model: selectedModel, systemPrompt: data.defaultSystemPrompt)
            data.conversations.insert(c, at: 0); selectedID = c.id
        }
        guard let id = selectedID, let index = data.conversations.firstIndex(where: { $0.id == id }) else { return }
        data.conversations[index].messages.append(Message(role: "user", content: content))
        draft = ""
        generate(id: id, provider: provider, key: key)
    }

    func retry() {
        guard generatingID == nil, let id = selectedID, let provider,
              let i = data.conversations.firstIndex(where: { $0.id == id }),
              data.conversations[i].messages.contains(where: { $0.role == "user" }) else { return }
        do {
            let key = try KeyVault.read(provider.id) ?? ""
            if data.conversations[i].messages.last?.role == "assistant" { data.conversations[i].messages.removeLast() }
            generate(id: id, provider: provider, key: key)
        } catch { self.error = error.localizedDescription }
    }

    private func generate(id: UUID, provider: Provider, key: String) {
        guard let i = data.conversations.firstIndex(where: { $0.id == id }) else { return }
        error = nil
        let history = data.conversations[i].messages
        let system = data.conversations[i].systemPrompt
        let model = selectedModel
        let response = Message(role: "assistant", content: "", model: model, providerName: provider.name, interrupted: true)
        data.conversations[i].messages.append(response)
        data.conversations[i].updatedAt = Date()
        generatingID = id
        save()
        generationTask = Task { [weak self] in
            guard let self else { return }
            defer {
                self.generatingID = nil
                self.generationTask = nil
                self.save()
            }
            do {
                try await ProviderClient.stream(provider: provider, key: key, model: model, systemPrompt: system, messages: history) { [weak self] text in
                    guard let self, let ci = self.data.conversations.firstIndex(where: { $0.id == id }),
                          let mi = self.data.conversations[ci].messages.firstIndex(where: { $0.id == response.id }) else { return }
                    self.data.conversations[ci].messages[mi].content += text
                }
                if let ci = self.data.conversations.firstIndex(where: { $0.id == id }),
                   let mi = self.data.conversations[ci].messages.firstIndex(where: { $0.id == response.id }) {
                    self.data.conversations[ci].messages[mi].interrupted = false
                }
            } catch is CancellationError {
                // The partial message stays available and is labelled as stopped.
            } catch {
                if !Task.isCancelled { self.error = error.localizedDescription }
            }
        }
    }
    func cancel() { generationTask?.cancel() }
    func prepareForQuit() { cancel(); save() }

    func exportConversation() {
        guard let conversation = active else { return }
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.plainText]
        panel.nameFieldStringValue = "\(conversation.title.replacingOccurrences(of: "/", with: "-" )).md"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        let text = "# \(conversation.title)\n\n" + conversation.messages.map {
            "## \($0.role == "user" ? "You" : ($0.providerName ?? "Assistant"))\n\n\($0.content)\n"
        }.joined(separator: "\n")
        do { try text.write(to: url, atomically: true, encoding: .utf8) }
        catch { self.error = "Export failed: \(error.localizedDescription)" }
    }
}
