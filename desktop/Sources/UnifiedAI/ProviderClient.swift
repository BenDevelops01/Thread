import Foundation

final class RedirectGuard: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

struct StreamEvent: Equatable {
    var text = ""
    var finished = false
    var error: String? = nil
}

enum ProviderClient {
    static let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 120
        config.timeoutIntervalForResource = 600
        config.urlCache = nil
        return URLSession(configuration: config, delegate: RedirectGuard(), delegateQueue: nil)
    }()

    static func endpoint(_ provider: Provider, path: String) throws -> URL {
        guard var parts = URLComponents(string: provider.baseURL.trimmingCharacters(in: .whitespacesAndNewlines)),
              let host = parts.host, !host.isEmpty,
              parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil else {
            throw ThreadError.message("Enter a valid API base URL without credentials, query parameters, or a fragment.")
        }
        let local = ["localhost", "127.0.0.1", "[::1]", "::1"].contains(host.lowercased())
        guard parts.scheme == "https" || (parts.scheme == "http" && local) else {
            throw ThreadError.message("Use HTTPS for remote providers. HTTP is supported only for models running on localhost.")
        }
        parts.path = parts.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        parts.path = "/" + ([parts.path, path].filter { !$0.isEmpty }.joined(separator: "/"))
        guard let url = parts.url else { throw ThreadError.message("The API URL is invalid.") }
        return url
    }

    static func request(_ provider: Provider, key: String, path: String) throws -> URLRequest {
        var request = URLRequest(url: try endpoint(provider, path: path))
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if provider.requiresKey && key.isEmpty { throw ThreadError.message("Add your \(provider.name) API key in Providers first.") }
        if !key.isEmpty {
            request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        }
        if provider.kind == .anthropic {
            request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        }
        return request
    }

    static func chatRequest(provider: Provider, key: String, model: String, systemPrompt: String, messages: [Message]) throws -> URLRequest {
        guard !model.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ThreadError.message("Choose a model before sending a message.")
        }
        var request = try request(provider, key: key, path: provider.kind == .anthropic ? "messages" : "chat/completions")
        request.httpMethod = "POST"
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        var history = messages.filter { !$0.content.isEmpty }.map { ["role": $0.role, "content": $0.content] }
        var body: [String: Any] = ["model": model, "stream": true]
        if provider.kind == .anthropic {
            body["max_tokens"] = 8192
            if !systemPrompt.isEmpty { body["system"] = systemPrompt }
        } else if !systemPrompt.isEmpty {
            history.insert(["role": "system", "content": systemPrompt], at: 0)
        }
        body["messages"] = history
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return request
    }

    static func models(provider: Provider, key: String) async throws -> [String] {
        var result: [String] = []
        var after: String? = nil
        for _ in 0..<30 {
            var req = try request(provider, key: key, path: "models")
            if provider.kind == .anthropic {
                var parts = URLComponents(url: req.url!, resolvingAgainstBaseURL: false)!
                parts.queryItems = [URLQueryItem(name: "limit", value: "100")]
                if let after { parts.queryItems?.append(URLQueryItem(name: "after_id", value: after)) }
                req.url = parts.url
            }
            let (data, response) = try await session.data(for: req)
            try validate(response, data: data)
            guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let rows = object["data"] as? [[String: Any]] else {
                throw ThreadError.message("This endpoint did not return a model list. Enter a model ID manually.")
            }
            result.append(contentsOf: rows.compactMap { $0["id"] as? String })
            if provider.kind == .anthropic, object["has_more"] as? Bool == true,
               let last = object["last_id"] as? String, last != after { after = last }
            else { break }
        }
        return Array(Set(result)).sorted()
    }

    static func validate(_ response: URLResponse, data: Data) throws {
        guard let response = response as? HTTPURLResponse else { throw ThreadError.message("No response from the provider.") }
        guard (200..<300).contains(response.statusCode) else {
            let status = response.statusCode
            let reason: String
            switch status {
            case 401, 403: reason = "The provider rejected this key or model access. Check your API key and account permissions."
            case 429: reason = "The provider's quota or rate limit was reached. Check your account balance or try again shortly."
            case 404: reason = "The endpoint or model was not found. Check the base URL and model ID."
            case 300..<400: reason = "The provider redirected this request. Set the final API base URL in provider settings."
            default: reason = "The provider returned an error. Try again or check your provider's status."
            }
            throw ThreadError.message("\(reason) (HTTP \(status))")
        }
    }

    static func decodeEvent(_ data: String, kind: APIKind) throws -> StreamEvent {
        if data == "[DONE]" { return StreamEvent(finished: true) }
        guard let bytes = data.data(using: .utf8),
              let json = try JSONSerialization.jsonObject(with: bytes) as? [String: Any] else {
            throw ThreadError.message("The provider returned an invalid stream event.")
        }
        if json["error"] != nil || json["type"] as? String == "error" {
            // Never surface raw provider errors: custom endpoints can echo submitted credentials.
            return StreamEvent(error: "The provider interrupted the response. Check your model, quota, and provider status, then retry.")
        }
        if kind == .anthropic {
            let type = json["type"] as? String
            let delta = json["delta"] as? [String: Any]
            if type == "content_block_delta", delta?["type"] as? String == "text_delta" {
                return StreamEvent(text: delta?["text"] as? String ?? "")
            }
            if type == "content_block_start", let block = json["content_block"] as? [String: Any], block["type"] as? String == "text" {
                return StreamEvent(text: block["text"] as? String ?? "")
            }
            return StreamEvent(finished: type == "message_stop")
        }
        guard let choice = (json["choices"] as? [[String: Any]])?.first else { return StreamEvent() }
        let delta = choice["delta"] as? [String: Any]
        return StreamEvent(text: delta?["content"] as? String ?? "", finished: (choice["finish_reason"] as? String) != nil)
    }

    static func stream(provider: Provider, key: String, model: String, systemPrompt: String, messages: [Message], onText: @escaping @MainActor (String) -> Void) async throws {
        let req = try chatRequest(provider: provider, key: key, model: model, systemPrompt: systemPrompt, messages: messages)
        let (bytes, response) = try await session.bytes(for: req)
        try validate(response, data: Data())
        var completed = false
        var hasText = false
        for try await line in bytes.lines {
            try Task.checkCancellation()
            guard line.hasPrefix("data:") else { continue }
            let value = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
            if value.isEmpty { continue }
            let event = try decodeEvent(value, kind: provider.kind)
            if let error = event.error { throw ThreadError.message(error) }
            if !event.text.isEmpty {
                hasText = true
                await onText(event.text)
            }
            if event.finished { completed = true; break }
        }
        try Task.checkCancellation()
        guard completed else { throw ThreadError.message("The connection ended before the response finished. You can retry this message.") }
        guard hasText else { throw ThreadError.message("This model returned no text. Select a text chat model and try again.") }
    }
}
