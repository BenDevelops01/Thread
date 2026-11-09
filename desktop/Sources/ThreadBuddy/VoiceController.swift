import AppKit
import AVFoundation
import SwiftUI
@MainActor final class VoiceController:NSObject,ObservableObject,AVSpeechSynthesizerDelegate {
 let model:BuddyModel;let dictation=Dictation();let speaker=AVSpeechSynthesizer()
 @Published var active=false
 var prefix=""
 init(model:BuddyModel){self.model=model;super.init();speaker.delegate=self
  dictation.onEnded={[weak self] error in guard let self else{return};self.model.notice=error;self.active=false;self.model.handsFree=false;self.model.listening=false}
  dictation.autoSubmit=true
  dictation.onText={[weak self] text in self?.model.draft=text}
  dictation.onFinal={[weak self] text in guard let self,self.active,!text.isEmpty else{return};self.model.listening=false;self.model.draft=text;self.model.agentMode=true;Task{await self.model.send();if !self.model.notice.isEmpty && !self.model.busy && !self.model.speaking{self.stop()}}}
  model.speak={[weak self] text in self?.say(text)};model.stopDictation={[weak self] in self?.stop()};model.startVoice={[weak self] in self?.toggle()}
 }
 func toggle(){active ? stop():start()}
 func start(){guard model.signedIn else{model.notice="Sign in through Settings before starting a conversation.";return};guard !model.busy,!model.speaking else{return};active=true;model.handsFree=true;dictation.allowAppleService=UserDefaults.standard.bool(forKey:"apple-speech-fallback");Task{await dictation.start();guard active else{dictation.stop();return};model.listening=dictation.recording;if !dictation.error.isEmpty{model.notice=dictation.error;active=false;model.handsFree=false}}}
 func stop(){active=false;model.handsFree=false;model.listening=false;dictation.stop();speaker.stopSpeaking(at:.immediate);model.speaking=false}
 func say(_ text:String){dictation.stop();model.listening=false;speaker.stopSpeaking(at:.immediate);let clean=text.replacingOccurrences(of:"[*#`]",with:"",options:.regularExpression);let utterance=AVSpeechUtterance(string:String(clean.prefix(2000)));utterance.rate=0.5;utterance.voice=AVSpeechSynthesisVoice(language:Locale.current.identifier.replacingOccurrences(of:"_",with:"-"));model.speaking=true;speaker.speak(utterance)}
 nonisolated func speechSynthesizer(_ synthesizer:AVSpeechSynthesizer,didFinish utterance:AVSpeechUtterance){Task{@MainActor in model.speaking=false;if active,model.plan.isEmpty{try? await Task.sleep(for:.milliseconds(350));start()}}}
 nonisolated func speechSynthesizer(_ synthesizer:AVSpeechSynthesizer,didCancel utterance:AVSpeechUtterance){Task{@MainActor in model.speaking=false}}
}
struct PetBubble:View {
 @ObservedObject var model:BuddyModel;@ObservedObject var voice:VoiceController
 @StateObject private var state=BubbleState()
 var close:()->Void
 var body:some View{VStack(alignment:.leading,spacing:16){
  HStack(spacing:10){Image(systemName:model.listening ? "waveform":"sparkle").foregroundStyle(.blue);Text(model.buddy.name).font(.system(size:14,weight:.semibold,design:.rounded));Text(model.listening ? "LISTENING":model.busy ? "THINKING":model.speaking ? "SPEAKING":"READY").font(.system(size:8,weight:.medium,design:.monospaced)).foregroundStyle(.secondary);Spacer();Button{model.showConversation()}label:{Image(systemName:"slider.horizontal.3")}.buttonStyle(.plain).help("Settings");Button{voice.stop();close()}label:{Image(systemName:"xmark")}.buttonStyle(.plain).help("Close and stop microphone")}
  if !model.signedIn{Text("Your little buddy is ready. Finish setup to start talking.").font(.callout).foregroundStyle(.secondary);Button("Finish setup"){model.showConversation()}.buttonStyle(.borderedProminent)}else{
   if model.messages.isEmpty{Text("What are we figuring out?").font(.system(size:23,weight:.medium,design:.rounded));Text("Tap the microphone and talk naturally. I’ll reply here and out loud.").font(.caption).foregroundStyle(.secondary)}
   else{ScrollView{Text(model.messages.last(where:{$0.role=="assistant"})?.content ?? "I’m listening…").font(.system(size:14)).lineSpacing(5).textSelection(.enabled).frame(maxWidth:.infinity,alignment:.leading)}.frame(maxHeight:190)}
   if model.listening,!model.draft.isEmpty{Text(model.draft).font(.caption).foregroundStyle(.secondary).lineLimit(4)}
   if let screen=model.screen{HStack(spacing:10){if let image=screen.image{Image(nsImage:image).resizable().scaledToFit().frame(width:70,height:45).clipShape(RoundedRectangle(cornerRadius:5))};Text("Screen shared for your next question").font(.caption);Spacer();Button{model.screen=nil}label:{Image(systemName:"xmark.circle.fill")}.buttonStyle(.plain)}}
   if let action=model.plan.first{VStack(alignment:.leading,spacing:9){Label("Your approval needed",systemImage:"hand.raised").font(.caption.bold());Text(action.label).font(.callout.bold());Text(action.explanation ?? "Review the target before continuing.").font(.caption).foregroundStyle(.secondary);if let text=action.text{Text(text).font(.caption).lineLimit(4).textSelection(.enabled)};HStack{Button("Deny"){model.plan=[];ScreenOverlay.shared.clear();if voice.active{voice.start()}};Button("Approve this action"){Task{await model.approve(action)}}.buttonStyle(.borderedProminent)}}.padding(12).background(.blue.opacity(0.08),in:RoundedRectangle(cornerRadius:11))}
   HStack(spacing:12){Button{voice.toggle()}label:{Image(systemName:voice.active ? "stop.fill":"mic.fill").font(.system(size:19)).frame(width:50,height:50).foregroundStyle(.white).background(voice.active ? Color.red:Color.blue,in:Circle())}.buttonStyle(.plain).disabled(model.busy).help(voice.active ? "Stop conversation":"Start voice conversation");VStack(alignment:.leading,spacing:4){Text(voice.active ? "Conversation is on":"Talk to \(model.buddy.name)").font(.caption.bold());Text(voice.active ? "Pause to send · tap stop to finish":"Microphone stays off until you start").font(.system(size:9)).foregroundStyle(.secondary)};Spacer();Button{Task{await model.captureScreen()}}label:{Image(systemName:"viewfinder").font(.system(size:19))}.buttonStyle(.plain).disabled(model.busy).help("Share a screenshot for the next question");Button{state.typing.toggle()}label:{Image(systemName:"keyboard")}.buttonStyle(.plain).help("Type a quick question")}
   if state.typing{HStack{TextField("Ask your buddy…",text:$model.draft).textFieldStyle(.roundedBorder).onSubmit{ask()};Button{ask()}label:{Image(systemName:"arrow.up.circle.fill")}.disabled(model.busy||model.draft.isEmpty)}}
  }
  if !model.notice.isEmpty{HStack(alignment:.top){Text(model.notice).font(.system(size:10)).foregroundStyle(.secondary).fixedSize(horizontal:false,vertical:true);Spacer();Button{model.notice=""}label:{Image(systemName:"xmark")}.buttonStyle(.plain)}}
 }.padding(20).frame(width:370).background(model.appearance=="dark" ? Color.black:Color.white,in:RoundedRectangle(cornerRadius:18)).overlay(RoundedRectangle(cornerRadius:18).stroke(model.appearance=="dark" ? Color.white.opacity(0.17):Color.black.opacity(0.12))).preferredColorScheme(model.appearance=="dark" ? .dark:.light)}
 func ask(){voice.stop();model.agentMode=true;Task{await model.send()}}
}
@MainActor final class BubbleState:ObservableObject{@Published var typing=false}
