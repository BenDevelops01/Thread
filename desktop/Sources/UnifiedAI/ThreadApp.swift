import SwiftUI
import AppKit

@main struct ThreadApp: App {
    @StateObject private var store = AppStore()
    var body: some Scene {
        WindowGroup("Thread") {
            ReactShell().environmentObject(store)
                .preferredColorScheme(.dark)
                .frame(minWidth: 920, minHeight: 650)
                .onReceive(NotificationCenter.default.publisher(for: NSApplication.willTerminateNotification)) { _ in store.prepareForQuit() }
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1180, height: 790)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Thread") { store.newThread() }.keyboardShortcut("n")
            }
            CommandGroup(replacing: .appSettings) {
                Button("Settings…") { store.page = "settings" }.keyboardShortcut(",")
            }
            CommandMenu("Thread") {
                Button("Providers") { store.page = "providers" }.keyboardShortcut("p", modifiers: [.command, .shift])
                Button("Export Conversation…") { store.exportConversation() }.disabled(store.active == nil)
                Button("Stop Response") { store.cancel() }.keyboardShortcut(".").disabled(store.generatingID == nil)
            }
        }
    }
}

