import AppKit
import SwiftUI

struct ThreadGlass:ViewModifier {
 var radius:CGFloat=26
 @Environment(\.accessibilityReduceTransparency) private var reduced
 @Environment(\.colorScheme) private var scheme
 @ViewBuilder func body(content:Content)->some View {
  if reduced {
   content.background(scheme == .dark ? Color.black:Color.white,in:RoundedRectangle(cornerRadius:radius))
    .overlay(RoundedRectangle(cornerRadius:radius).stroke(Color.primary.opacity(0.15)))
  }else if #available(macOS 26.0,*) {
   content.glassEffect(.regular,in:RoundedRectangle(cornerRadius:radius))
  }else{
   content.background(.ultraThinMaterial,in:RoundedRectangle(cornerRadius:radius))
    .overlay(RoundedRectangle(cornerRadius:radius).stroke(.white.opacity(scheme == .dark ? 0.15:0.6)))
  }
 }
}
extension View {func threadGlass(_ radius:CGFloat=26)->some View{modifier(ThreadGlass(radius:radius))}}

struct PetControlStrip:View {
 @ObservedObject var model:BuddyModel
 @ObservedObject var voice:VoiceController
 var onVoice:()->Void
 var onText:()->Void
 var body:some View {
  HStack(spacing:6){
   Button(action:onVoice){Image(systemName:voice.active ? "stop.fill":"waveform").font(.system(size:16,weight:.medium)).frame(width:44,height:38)}
    .help(voice.active ? "Stop voice conversation":"Talk to your buddy").accessibilityLabel(voice.active ? "Stop voice conversation":"Start voice conversation")
    .foregroundStyle(voice.active ? Color.blue:Color.primary)
   Divider().frame(height:17).opacity(0.4)
   Button(action:onText){Image(systemName:"text.bubble").font(.system(size:16,weight:.medium)).frame(width:44,height:38)}
    .help("Type a message").accessibilityLabel("Type a message")
  }.buttonStyle(.plain).padding(3).threadGlass(24).padding(2).frame(width:112,height:48)
   .preferredColorScheme(model.appearance=="dark" ? .dark:.light)
 }
}
