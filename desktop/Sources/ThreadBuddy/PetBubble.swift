import AppKit
import SwiftUI

struct PetBubble:View {
 @ObservedObject var model:BuddyModel
 @ObservedObject var voice:VoiceController
 var close:()->Void
 @FocusState private var textFocused:Bool
 @Environment(\.accessibilityReduceMotion) private var reduceMotion
 private var voiceIsOn:Bool{voice.active || model.speaking || model.voiceRendering}
 private var reply:String?{model.messages.last(where:{$0.role=="assistant"})?.content}
 private var status:String{voice.dictating ? "Dictating your message":model.listening ? "Listening to you":model.busy ? "Thinking it through":model.speaking ? "Speaking":model.voiceRendering ? "Preparing a reply":"Here with you"}
 var body:some View {
  VStack(alignment:.leading,spacing:15){
   header
   if !model.signedIn{signedOut}else{
    if let reply{response(reply)}else{welcome}
    if let screen=model.screen{attachment(screen)}
    if let action=model.plan.first{approval(action)}
    if model.inputMode == .text{composer}else{voicePanel}
    inputSwitcher
   }
   if !model.notice.isEmpty{notice}
  }.padding(20).frame(width:420).threadGlass(28).padding(1)
   .preferredColorScheme(model.appearance=="dark" ? .dark:.light)
   .onChange(of:model.inputMode){_,mode in textFocused=mode == .text}
   .onAppear{textFocused=model.inputMode == .text}
 }
 private var header:some View {
  HStack(spacing:10){
   if let image=SpriteCache.image(model.buddyID,0){Image(nsImage:image).resizable().interpolation(.none).scaledToFit().frame(width:30,height:33).accessibilityHidden(true)}
   VStack(alignment:.leading,spacing:3){Text(model.buddy.name).font(.system(size:14,weight:.semibold));HStack(spacing:5){Circle().fill(model.listening ? Color.green:Color.secondary.opacity(0.5)).frame(width:5,height:5);Text(status).font(.system(size:10)).foregroundStyle(Color.primary.opacity(0.68))}}
   Spacer()
   Menu{Button("Share a screenshot",systemImage:"viewfinder"){Task{await model.captureScreen()}}.disabled(model.busy);Toggle("Read replies aloud",isOn:$model.voiceReplies).onChange(of:model.voiceReplies){_,value in if !value{voice.cancelSpeech()}};Divider();Button("New conversation",systemImage:"square.and.pencil"){voice.stop();model.messages=[];model.plan=[];model.screen=nil;model.draft="";ScreenOverlay.shared.clear()};Button("Settings",systemImage:"slider.horizontal.3"){model.showConversation()}}label:{Image(systemName:"ellipsis").frame(width:28,height:28)}.menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize().help("Conversation options").accessibilityLabel("Conversation options")
   Button{voice.stop();close()}label:{Image(systemName:"xmark").font(.system(size:11,weight:.semibold)).frame(width:28,height:28)}.buttonStyle(.plain).foregroundStyle(Color.primary.opacity(0.68)).help("Close and stop microphone").accessibilityLabel("Close and stop microphone")
  }
 }
 private var welcome:some View {
  VStack(alignment:.leading,spacing:8){Text(model.inputMode == .text ? "What’s on your mind?":"Let’s talk it through.").font(.system(size:25,weight:.medium)).tracking(-0.6);Text(model.inputMode == .text ? "A question, a rough idea, the confusing bit.":"Start a conversation. Pause to send your turn.").font(.system(size:12)).foregroundStyle(Color.primary.opacity(0.68)).fixedSize(horizontal:false,vertical:true)}.padding(.vertical,8)
 }
 private var signedOut:some View {
  VStack(alignment:.leading,spacing:15){Text("A little company.\nOne sign-in away.").font(.system(size:25,weight:.medium));Text("Sign in once. This Mac can remember you.").font(.callout).foregroundStyle(Color.primary.opacity(0.68));Button("Sign in to Thread"){model.showConversation()}.buttonStyle(.borderedProminent)}.padding(.vertical,8)
 }
 private func response(_ text:String)->some View {
  VStack(alignment:.leading,spacing:10){ScrollView{Text(text).font(.system(size:14)).lineSpacing(6).textSelection(.enabled).frame(maxWidth:.infinity,alignment:.leading)}.frame(minHeight:55,maxHeight:150)
   HStack(spacing:16){Button{NSPasteboard.general.clearContents();NSPasteboard.general.setString(text,forType:.string)}label:{Image(systemName:"doc.on.doc")}.help("Copy reply").accessibilityLabel("Copy reply");Button{model.speaking || model.voiceRendering ? voice.stop():voice.say(text)}label:{Image(systemName:model.speaking || model.voiceRendering ? "stop.circle":"speaker.wave.2")}.help("Read or stop this reply").accessibilityLabel(model.speaking || model.voiceRendering ? "Stop speaking":"Read this reply");Spacer();if model.busy{ProgressView().controlSize(.small)}}.font(.system(size:12)).foregroundStyle(Color.primary.opacity(0.68)).buttonStyle(.plain)
  }
 }
 private func attachment(_ screen:ScreenSnapshot)->some View {
  HStack(spacing:10){if let image=screen.image{Image(nsImage:image).resizable().scaledToFill().frame(width:57,height:39).clipped().clipShape(RoundedRectangle(cornerRadius:7))};VStack(alignment:.leading,spacing:3){Text("Screen attached").font(.system(size:11,weight:.medium));Text("For your next question only").font(.system(size:10)).foregroundStyle(Color.primary.opacity(0.68))};Spacer();Button{model.screen=nil}label:{Image(systemName:"xmark.circle.fill")}.buttonStyle(.plain).foregroundStyle(Color.primary.opacity(0.68)).help("Remove screenshot").accessibilityLabel("Remove screenshot")}.padding(10).background(Color.primary.opacity(0.045),in:RoundedRectangle(cornerRadius:13))
 }
 private var composer:some View {
  VStack(alignment:.leading,spacing:9){
   VStack(alignment:.leading,spacing:12){ZStack(alignment:.topLeading){if model.draft.isEmpty{Text("Message \(model.buddy.name)…").foregroundStyle(Color.primary.opacity(0.68)).allowsHitTesting(false).accessibilityHidden(true)};TextField("",text:$model.draft,axis:.vertical).textFieldStyle(.plain).lineLimit(1...5).focused($textFocused).disabled(voice.dictating).onSubmit{ask()}.accessibilityLabel("Message your buddy")}.font(.system(size:14)).frame(minHeight:29,alignment:.top)
    HStack(spacing:12){Button{Task{await model.captureScreen()}}label:{Image(systemName:"plus").font(.system(size:17)).frame(width:28,height:28)}.buttonStyle(.plain).disabled(model.busy).help("Attach a screenshot").accessibilityLabel("Attach a screenshot");Spacer();Button{voice.toggleDictation()}label:{Image(systemName:voice.dictating ? "stop.fill":"mic").font(.system(size:15,weight:.medium)).frame(width:31,height:31).foregroundStyle(voice.dictating ? Color.blue:Color.primary)}.buttonStyle(.plain).disabled(model.busy).help(voice.dictating ? "Finish dictation":"Dictate a message · review before sending").accessibilityLabel(voice.dictating ? "Finish dictation":"Dictate a message");Button(action:ask){Image(systemName:"arrow.up").font(.system(size:14,weight:.semibold)).frame(width:33,height:33).foregroundStyle(Color(nsColor:.controlBackgroundColor)).background(Color.primary,in:Circle())}.buttonStyle(.plain).disabled(model.busy || model.draft.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty || voice.dictating).opacity(model.draft.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty ? 0.3:1).keyboardShortcut(.return,modifiers:.command).help("Send message (Command-Return)").accessibilityLabel("Send message")}.foregroundStyle(Color.primary.opacity(0.68))
   }.padding(14).background(.regularMaterial,in:RoundedRectangle(cornerRadius:21)).overlay(RoundedRectangle(cornerRadius:21).stroke(Color.primary.opacity(0.1)))
   Text(voice.dictating ? "Listening · tap the mic to finish, then review and send.":"⌘↩ to send · the mic fills your draft without sending it.").font(.system(size:10)).foregroundStyle(Color.primary.opacity(0.68)).fixedSize(horizontal:false,vertical:true).padding(.horizontal,3)
  }
 }
 private var voicePanel:some View {
  VStack(spacing:15){TimelineView(.animation(minimumInterval:0.1,paused:reduceMotion || (!model.listening && !model.speaking))){context in HStack(spacing:5){ForEach(0..<19,id:\.self){i in Capsule().fill(Color.primary.opacity(0.65)).frame(width:4,height:(!reduceMotion && (model.listening || model.speaking)) ? 9+abs(sin(context.date.timeIntervalSinceReferenceDate*4+Double(i)*0.8))*22:6)}}.frame(height:36).accessibilityHidden(true)}
   Button{voice.toggle()}label:{Label(voiceIsOn ? "Stop conversation":"Start talking",systemImage:voiceIsOn ? "stop.fill":"waveform").font(.system(size:12,weight:.medium)).padding(.horizontal,17).frame(height:37)}.buttonStyle(.borderedProminent).tint(Color.primary).disabled(model.busy && !voiceIsOn)
   Text(model.listening ? "Microphone on · pause to send your turn.":model.busy ? "Waiting for your AI. You can stop voice at any time.":"Your microphone stays off until you start.").font(.system(size:10)).foregroundStyle(Color.primary.opacity(0.68)).multilineTextAlignment(.center)
  }.frame(maxWidth:.infinity).padding(.vertical,12)
 }
 private var inputSwitcher:some View {
  HStack(spacing:8){Spacer();modeButton(.voice,label:"Voice",symbol:"waveform");modeButton(.text,label:"Text",symbol:"text.bubble");Spacer()}
 }
 private func modeButton(_ mode:BuddyInputMode,label:String,symbol:String)->some View {
  Button{voice.stop();model.inputMode=mode;if mode == .text{NSApp.activate(ignoringOtherApps:true);textFocused=true}}label:{Label(label,systemImage:symbol).font(.system(size:11,weight:.medium)).padding(.horizontal,13).frame(height:31).background(model.inputMode==mode ? Color.primary.opacity(0.09):Color.clear,in:Capsule())}.buttonStyle(.plain).foregroundStyle(model.inputMode==mode ? Color.primary:Color.primary.opacity(0.68)).help(mode == .voice ? "Voice conversation":"Type or dictate a message").accessibilityLabel(mode == .voice ? "Voice conversation mode":"Text message mode").accessibilityAddTraits(model.inputMode==mode ? .isSelected:[])
 }
 private var notice:some View {
  HStack(alignment:.top,spacing:8){Image(systemName:"info.circle");Text(model.notice).font(.system(size:11)).fixedSize(horizontal:false,vertical:true);Spacer(minLength:0);Button{model.notice=""}label:{Image(systemName:"xmark")}.buttonStyle(.plain).accessibilityLabel("Dismiss notice")}.foregroundStyle(Color.primary.opacity(0.68)).font(.system(size:11))
 }
 private func approval(_ action:DesktopAction)->some View {
  VStack(alignment:.leading,spacing:10){Label("Your approval needed",systemImage:"hand.raised").font(.system(size:11,weight:.semibold));Text(action.label).font(.system(size:13,weight:.semibold)).lineLimit(2);Text(action.explanation ?? "Review the target before continuing.").font(.system(size:11)).foregroundStyle(Color.primary.opacity(0.68)).lineSpacing(3).lineLimit(3);if let text=action.text{Text(text).font(.system(size:11)).lineLimit(3).textSelection(.enabled)};HStack{Button("Deny"){model.plan=[];ScreenOverlay.shared.clear();if voice.active{voice.start()}}.buttonStyle(.borderless);Spacer();Button("Approve this action"){Task{await model.approve(action)}}.buttonStyle(.borderedProminent).controlSize(.small)}}.padding(14).background(.regularMaterial,in:RoundedRectangle(cornerRadius:15))
 }
 private func ask(){guard !model.busy,!voice.dictating,!model.draft.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else{return};voice.stop();model.agentMode=true;Task{await model.send()}}
}
