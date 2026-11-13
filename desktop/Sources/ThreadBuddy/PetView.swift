import SwiftUI
import AppKit
@MainActor enum SpriteCache {
 static var images:[String:NSImage]=[:]
 static func image(_ kind:String,_ frame:Int)->NSImage?{
  let key="\(kind)-\(frame)";if let image=images[key]{return image}
  let bundled=Bundle.main.resourceURL?.appendingPathComponent("Buddies/\(key).png")
  let dev=URL(fileURLWithPath:#filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Resources/Buddies/\(key).png")
  if let path=[bundled,dev].compactMap({$0}).first(where:{FileManager.default.fileExists(atPath:$0.path)}),let image=NSImage(contentsOf:path){images[key]=image;return image};return nil
 }
}
struct PetArtwork:View {
 let kind:String;let color:Color;var animated=true;var pose="idle"
 @Environment(\.accessibilityReduceMotion) var reduceMotion
 var body:some View{TimelineView(.animation(minimumInterval:0.15,paused:!animated||reduceMotion)){timeline in
  let t=timeline.date.timeIntervalSinceReferenceDate
  let frame=pose=="listening" ? 3:pose=="speaking" ? (Int(t*5)%2==0 ? 2:0):pose=="walking" ? 4+Int(t*4)%2:(Int(t*4)%27==0 ? 1:0)
  Group{if let image=SpriteCache.image(kind,animated && !reduceMotion ? frame:0){Image(nsImage:image).resizable().interpolation(.none).scaledToFit()}else{Image(systemName:"sparkles").resizable().scaledToFit().foregroundStyle(color)}}.shadow(color:color.opacity(0.12),radius:5).offset(y:reduceMotion || !animated ? 0:sin(t*1.9)*2)
 }.frame(width:180,height:198).accessibilityLabel("\(Buddy.all.first{$0.id==kind}?.name ?? "Thread") pixel-art buddy")}
}
struct PetView:View {
 @ObservedObject var model:BuddyModel
 var body:some View{VStack(spacing:0){if model.busy||model.listening{Text(model.listening ? "listening…":"thinking…").font(.system(size:10,weight:.medium,design:.monospaced)).padding(.horizontal,10).padding(.vertical,5).background(.ultraThinMaterial,in:Capsule())}else{Color.clear.frame(height:24)};PetArtwork(kind:model.buddyID,color:model.buddy.color,pose:model.listening ? "listening":model.speaking ? "speaking":"idle")}.frame(width:200,height:235).background(.clear).accessibilityElement(children:.ignore).accessibilityLabel("Talk to \(model.buddy.name)").accessibilityAddTraits(.isButton).accessibilityAction{model.showBubble()}}
}
