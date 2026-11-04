import SwiftUI
import WebKit
import Combine

struct ReactShell: NSViewRepresentable {
    @EnvironmentObject var store: AppStore
    func makeCoordinator() -> Coordinator { Coordinator(store: store) }
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "thread")
        let view = WKWebView(frame: .zero, configuration: config)
        view.setValue(false, forKey: "drawsBackground")
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        context.coordinator.view = view
        if let url = Bundle.main.resourceURL?.appendingPathComponent("ui/app.html") {
            view.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return view
    }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
    @MainActor final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
        let store: AppStore
        weak var view: WKWebView?
        var subscription: AnyCancellable?
        var scheduledPublish: DispatchWorkItem?
        init(store: AppStore) {
            self.store = store
            super.init()
            subscription = store.objectWillChange.sink { [weak self] _ in
                DispatchQueue.main.async { self?.schedulePublish() }
            }
        }
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = NSAlert(); alert.messageText = message
            alert.addButton(withTitle: "Confirm"); alert.addButton(withTitle: "Cancel")
            completionHandler(alert.runModal() == .alertFirstButtonReturn)
        }
        func navigationComplete() { publish() }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { publish() }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if navigationAction.navigationType == .linkActivated {
                if ["https", "mailto"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }
                decisionHandler(.cancel); return
            }
            decisionHandler(url.isFileURL ? .allow : .cancel)
        }
        func json(_ value: Any) -> String {
            guard JSONSerialization.isValidJSONObject(value), let bytes = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]), let string = String(data: bytes, encoding: .utf8) else { return "null" }
            return string
        }
        func schedulePublish() {
            guard scheduledPublish == nil else { return }
            let work = DispatchWorkItem { [weak self] in self?.scheduledPublish = nil; self?.publish() }
            scheduledPublish = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.06, execute: work)
        }
        func publish() {
            guard let bytes = try? JSONEncoder().encode(store.data), let object = try? JSONSerialization.jsonObject(with: bytes) else { return }
            let state: [String: Any] = ["workspace": object, "page": store.page, "selectedID": store.selectedID?.uuidString as Any? ?? NSNull(), "providerID": store.selectedProviderID, "model": store.selectedModel, "generatingID": store.generatingID?.uuidString as Any? ?? NSNull(), "error": store.error as Any? ?? NSNull()]
            view?.evaluateJavaScript("window.__threadState?.(\(json(state)))", completionHandler: nil)
        }
        func reply(_ id: String, value: Any = [:], error: String? = nil) {
            let object: [String: Any] = ["id": id, "value": value, "error": error as Any? ?? NSNull()]
            view?.evaluateJavaScript("window.__threadReply?.(\(json(object)))", completionHandler: nil)
        }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
                  let body = message.body as? [String: Any], let id = body["id"] as? String, let action = body["action"] as? String else { return }
            let data = body["data"] as? [String: Any] ?? [:]
            Task { @MainActor in
                do {
                    switch action {
                    case "ready": publish()
                    case "page": store.page = data["page"] as? String ?? "chat"
                    case "new": store.newThread()
                    case "select": if let conversation = store.data.conversations.first(where: { $0.id.uuidString == data["id"] as? String }) { store.select(conversation) }
                    case "send": store.draft = data["text"] as? String ?? ""; store.send()
                    case "stop": store.cancel()
                    case "retry": store.retry()
                    case "cloudSessionRead": reply(id, value: ["session": try KeyVault.read("thread-cloud-session", allowInteraction: false) as Any? ?? NSNull()]); return
                    case "cloudSessionWrite": try KeyVault.write(data["session"] as? String ?? "", for: "thread-cloud-session")
                    case "cloudSessionDelete": try KeyVault.delete("thread-cloud-session")
                    case "copy": NSPasteboard.general.clearContents(); NSPasteboard.general.setString(data["text"] as? String ?? "", forType: .string)
                    case "clearError": store.error = nil
                    case "model":
                        if let provider = store.data.providers.first(where: { $0.id == data["providerID"] as? String }) { store.chooseProvider(provider); store.chooseModel(data["model"] as? String ?? "") }
                    case "models":
                        let provider = try decodeProvider(data)
                        let key = try providerKey(data, provider: provider)
                        let models = try await ProviderClient.models(provider: provider, key: key)
                        reply(id, value: ["models": models]); return
                    case "saveProvider":
                        var provider = try decodeProvider(data)
                        _ = try ProviderClient.endpoint(provider, path: "models")
                        provider.selectedModel = provider.selectedModel.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !provider.selectedModel.isEmpty, !provider.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw ThreadError.message("Enter a provider name and a text model ID.") }
                        let key = try providerKey(data, provider: provider)
                        guard !provider.requiresKey || !key.isEmpty else { throw ThreadError.message("Enter your API key.") }
                        if !provider.requiresKey { try KeyVault.delete(provider.id) }
                        provider.enabled = true
                        try store.updateProvider(provider, key: key.isEmpty ? nil : key)
                    case "disconnect": if let provider = store.data.providers.first(where: { $0.id == data["id"] as? String }) { try store.disconnect(provider) }
                    case "delete": if let id = UUID(uuidString: data["id"] as? String ?? "") { store.deleteConversation(id) }
                    case "export": store.exportConversation()
                    case "threadSettings": store.setConversation(title: data["title"] as? String ?? "Untitled", system: data["system"] as? String ?? "")
                    case "defaultSystem": store.data.defaultSystemPrompt = data["text"] as? String ?? ""; store.save()
                    default: throw ThreadError.message("Unknown action.")
                    }
                    publish(); reply(id)
                } catch { reply(id, error: error.localizedDescription) }
            }
        }
        func decodeProvider(_ data: [String: Any]) throws -> Provider {
            let bytes = try JSONSerialization.data(withJSONObject: data["provider"] ?? [:])
            return try JSONDecoder().decode(Provider.self, from: bytes)
        }
        func providerKey(_ data: [String: Any], provider: Provider) throws -> String {
            if !provider.requiresKey { return "" }
            let typed = (data["key"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if !typed.isEmpty { return typed }
            guard let saved = store.data.providers.first(where: { $0.id == provider.id }), saved.baseURL == provider.baseURL else { return "" }
            return try KeyVault.read(provider.id) ?? ""
        }
    }
}
