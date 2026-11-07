// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "ThreadBuddy", platforms: [.macOS(.v14)], products: [.executable(name:"Thread",targets:["ThreadBuddy"])], targets:[.executableTarget(name:"ThreadBuddy")],swiftLanguageModes:[.v5])
