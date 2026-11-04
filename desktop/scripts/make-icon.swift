import AppKit
let output = CommandLine.arguments[1]
let sizes = [16, 32, 128, 256, 512]
try FileManager.default.createDirectory(atPath: output, withIntermediateDirectories: true)
for base in sizes {
    for scale in [1, 2] {
        let n = base * scale
        let image = NSImage(size: NSSize(width: n, height: n))
        image.lockFocus()
        let rect = NSRect(x: 0, y: 0, width: n, height: n)
        NSColor.clear.setFill(); rect.fill()
        let inset = CGFloat(n) * 0.065
        let face = NSBezierPath(roundedRect: rect.insetBy(dx: inset, dy: inset), xRadius: CGFloat(n) * 0.21, yRadius: CGFloat(n) * 0.21)
        NSGradient(starting: NSColor(calibratedRed: 0.18, green: 0.15, blue: 0.23, alpha: 1), ending: NSColor(calibratedWhite: 0.075, alpha: 1))!.draw(in: face, angle: -90)
        NSColor(calibratedWhite: 1, alpha: 0.12).setStroke(); face.lineWidth = max(1, CGFloat(n) * 0.002); face.stroke()
        let width = CGFloat(n)
        let markPath = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("brand-mark.png").path
        let mark = NSImage(contentsOfFile: markPath)!
        mark.draw(in: NSRect(x: width * 0.23, y: width * 0.21, width: width * 0.54, height: width * 0.58))
        image.unlockFocus()
        let rep = NSBitmapImageRep(data: image.tiffRepresentation!)!
        let suffix = scale == 2 ? "@2x" : ""
        try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(output)/icon_\(base)x\(base)\(suffix).png"))
    }
}
