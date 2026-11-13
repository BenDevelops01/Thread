import AppKit
import AVFoundation
import SwiftUI

enum SpeechVoices {
 static func spoken(_ value:String)->String {
  var text=value.replacingOccurrences(of:"```[\\s\\S]*?```",with:" I’ve included the code in the bubble. ",options:.regularExpression)
  text=text.replacingOccurrences(of:"\\[([^\\]]+)\\]\\([^)]+\\)",with:"$1",options:.regularExpression).replacingOccurrences(of:"https?://\\S+",with:"the linked page",options:.regularExpression)
  return String(text.replacingOccurrences(of:"[*#`_]",with:"",options:.regularExpression).trimmingCharacters(in:.whitespacesAndNewlines).prefix(2400))
 }
}
@MainActor final class VoiceController:NSObject,ObservableObject,AVAudioPlayerDelegate {
 let model:BuddyModel;let dictation:any DictationService;let neural=NeuralSpeech()
 @Published var active=false
 @Published var dictating=false
 private var dictationPrefix=""
 private var parkedDraft:String?
 private var player:AVAudioPlayer?;private var queue:[URL]=[];private var playingURL:URL?;private var speechID:String?;private var generationDone=false;private var suppressReply=false
 init(model:BuddyModel,dictation injectedDictation:(any DictationService)?=nil,loadNeuralVoice:Bool=true){self.model=model;self.dictation=injectedDictation ?? Dictation();super.init()
  neural.onStatus={[weak self] status,progress,ready in guard let self else{return};self.model.neuralStatus=status;self.model.neuralProgress=progress;self.model.neuralReady=ready;self.model.neuralInstalling = !ready && !status.contains("attention") && !status.contains("stopped")}
  neural.onAudio={[weak self] id,url in guard let self else{return};if self.speechID==id{self.queue.append(url);self.playNext()}else{try? FileManager.default.removeItem(at:url)}}
  neural.onDone={[weak self] id in guard let self,self.speechID==id else{return};self.generationDone=true;self.finishIfReady()}
  neural.onError={[weak self] message in guard let self else{return};self.stop();self.model.neuralInstalling=false;self.model.neuralReady=false;self.model.notice=message}
  dictation.onEnded={[weak self] error in guard let self else{return};self.stop();self.model.notice=error}
  dictation.autoSubmit=true;dictation.onText={[weak self] text in guard let self else{return};self.model.draft=self.dictating ? self.dictationPrefix+text:text}
  dictation.onFinal={[weak self] text in guard let self else{return};if self.dictating{self.model.draft=self.dictationPrefix+text;self.finishDictation();return};guard self.active,!text.isEmpty else{return};self.model.listening=false;self.model.draft=text;self.model.agentMode=true;Task{await self.model.send();self.suppressReply=false;if self.active && !self.model.voiceReplies && self.model.plan.isEmpty && self.model.notice.isEmpty{self.start()};if !self.model.notice.isEmpty && !self.model.busy && !self.model.speaking && !self.model.voiceRendering{self.stop()}}}
  model.speak={[weak self] text in self?.say(text)};model.stopDictation={[weak self] in self?.stop()};model.startVoice={[weak self] in self?.toggle()};model.prepareNeuralVoice={[weak self] in self?.neural.load()};model.cancelNeuralVoice={[weak self] in guard let self else{return};self.shutdown();self.model.neuralReady=false;self.model.neuralInstalling=false;self.model.neuralStatus="Voice setup paused"}
  if loadNeuralVoice,NeuralSpeech.isInstalled{neural.load()}
 }
 func toggle(){if dictating{finishDictation()};model.inputMode = .voice;(active || model.speaking || model.voiceRendering) ? stop():start()}
 func start(){guard model.signedIn else{model.notice="Sign in through Settings before starting a conversation.";return};guard !model.busy,!model.speaking,!model.voiceRendering else{return};if !active{parkedDraft=model.draft};dictation.autoSubmit=true;active=true;suppressReply=false;model.handsFree=true;dictation.allowAppleService=UserDefaults.standard.bool(forKey:"apple-speech-fallback");Task{await dictation.start();guard active else{dictation.stop();return};model.listening=dictation.recording;if !dictation.error.isEmpty{model.notice=dictation.error;active=false;model.handsFree=false}}}
 func stop(){suppressReply=model.busy;active=false;model.handsFree=false;model.listening=false;dictating=false;dictation.stop();cancelSpeech();if let draft=parkedDraft{model.draft=draft;parkedDraft=nil}}
 func toggleDictation(){dictating ? finishDictation():startDictating()}
 func startDictating(){
  guard model.signedIn,!model.busy else{return};stop();model.inputMode = .text
  dictationPrefix=model.draft.isEmpty ? "":model.draft+" "
  dictating=true;dictation.autoSubmit=false;dictation.allowAppleService=UserDefaults.standard.bool(forKey:"apple-speech-fallback")
  Task{await dictation.start();guard dictating else{dictation.stop();return};model.listening=dictation.recording;if !dictation.error.isEmpty{model.notice=dictation.error;dictating=false;model.listening=false}}
 }
 func finishDictation(){dictating=false;model.listening=false;dictation.stop()}
 func cancelSpeech(){if let id=speechID{neural.cancel(id)};speechID=nil;player?.stop();player=nil;for url in queue+[playingURL].compactMap({$0}){try? FileManager.default.removeItem(at:url)};queue=[];playingURL=nil;model.speaking=false;model.voiceRendering=false}
 func say(_ text:String){if suppressReply && model.busy{suppressReply=false;return};suppressReply=false;dictation.stop();model.listening=false;cancelSpeech();let spoken=SpeechVoices.spoken(text);guard !spoken.isEmpty else{return};let id=UUID().uuidString.lowercased();speechID=id;generationDone=false;model.voiceRendering=true;neural.speak(id:id,text:spoken,voice:model.neuralVoiceID,speed:min(1.2,max(0.8,model.voiceSpeed)))}
 private func playNext(){guard player==nil,!queue.isEmpty else{return};let url=queue.removeFirst();do{let audio=try AVAudioPlayer(contentsOf:url);audio.delegate=self;audio.prepareToPlay();guard audio.play() else{throw APIError(message:"Audio output unavailable")};player=audio;playingURL=url;model.voiceRendering=false;model.speaking=true}catch{try? FileManager.default.removeItem(at:url);stop();model.notice="The neural voice was generated, but macOS could not play it. Check your audio output."}}
 private func finishIfReady(){guard generationDone,queue.isEmpty,player==nil,speechID != nil else{return};speechID=nil;model.speaking=false;model.voiceRendering=false;if active,model.plan.isEmpty{Task{try? await Task.sleep(for:.milliseconds(400));if active{start()}}}}
 nonisolated func audioPlayerDidFinishPlaying(_ player:AVAudioPlayer,successfully flag:Bool){Task{@MainActor in guard self.player===player else{return};self.player=nil;if let url=playingURL{try? FileManager.default.removeItem(at:url)};playingURL=nil;model.speaking=false;playNext();finishIfReady()}}
 func shutdown(){stop();neural.shutdown()}
}
