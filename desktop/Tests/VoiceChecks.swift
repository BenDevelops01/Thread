import Foundation

@MainActor final class FakeDictation:DictationService {
 var recording=false
 var error=""
 var autoSubmit=false
 var allowAppleService=false
 var onText:(String)->Void={_ in}
 var onFinal:(String)->Void={_ in}
 var onEnded:(String)->Void={_ in}
 var suspendStart=false
 var waiting:CheckedContinuation<Void,Never>?
 var starts=0
 func start() async{starts+=1;if suspendStart{await withCheckedContinuation{waiting=$0}};recording=true}
 func stop(){recording=false}
}
@main struct VoiceChecks {
 @MainActor static func main() async {
  let model=BuddyModel(persistSession:false);model.signedIn=true;model.draft="Keep this thought."
  let dictation=FakeDictation();let voice=VoiceController(model:model,dictation:dictation,loadNeuralVoice:false)
  voice.startDictating()
  for _ in 0..<20{await Task.yield();if dictation.recording{break}}
  precondition(voice.dictating && model.listening && !dictation.autoSubmit)
  dictation.onText("Add the spoken part.")
  precondition(model.draft=="Keep this thought. Add the spoken part.")
  dictation.onFinal("Add the spoken part.")
  precondition(!voice.dictating && !dictation.recording && !model.busy && model.messages.isEmpty,"Dictation must never send a model request")
  let saved=model.draft
  voice.toggle()
  for _ in 0..<20{await Task.yield();if dictation.recording{break}}
  precondition(voice.active && dictation.autoSubmit && model.inputMode == .voice)
  dictation.onText("A separate voice turn")
  voice.stop()
  precondition(model.draft==saved && !voice.active && !model.listening,"Switching back must restore the unsent text draft")
  dictation.suspendStart=true
  voice.startDictating()
  for _ in 0..<20{await Task.yield();if dictation.waiting != nil{break}}
  precondition(dictation.waiting != nil)
  voice.finishDictation();dictation.waiting?.resume();dictation.waiting=nil
  for _ in 0..<20{await Task.yield()}
  precondition(!dictation.recording && !voice.dictating && !model.listening,"A late permission result must not restart a stopped microphone")
  voice.shutdown()
  print("PASS: dictated text stays unsent, existing drafts survive mode switching, and late microphone permission results stay stopped. No account or API request used.")
 }
}
