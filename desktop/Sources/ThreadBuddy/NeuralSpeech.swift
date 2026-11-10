import Foundation
// Private stdio process. Speech is synthesized locally; no prompt text leaves this Mac.
@MainActor final class NeuralSpeech {
 static var root:URL{FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("Thread/NeuralVoice",isDirectory:true)}
 static var isInstalled:Bool{FileManager.default.fileExists(atPath:root.appendingPathComponent("ready.json").path)}
 var onStatus:(String,Int,Bool)->Void={_,_,_ in}
 var onAudio:(String,URL)->Void={_,_ in}
 var onDone:(String)->Void={_ in}
 var onError:(String)->Void={_ in}
 private var process:Process?;private var input:FileHandle?;private var output:FileHandle?;private var errors:FileHandle?;private var buffer=Data();private var ready=false
 private var pending:[String:Any]?;private var lastSpeechID:String?
 private var runtime:(URL,URL)?{
  let executable=Bundle.main.bundleURL.appendingPathComponent("Contents/Helpers/thread-voice-node")
  let script=Bundle.main.resourceURL?.appendingPathComponent("NeuralVoice/engine.mjs")
  if let script,FileManager.default.isExecutableFile(atPath:executable.path),FileManager.default.fileExists(atPath:script.path){return(executable,script)}
  let source=URL(fileURLWithPath:#filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("voice/engine.mjs")
  let node=URL(fileURLWithPath:"/usr/local/bin/node")
  return FileManager.default.fileExists(atPath:source.path)&&FileManager.default.isExecutableFile(atPath:node.path) ? (node,source):nil
 }
 func load(){
  if process?.isRunning==true{if !ready{send(["type":"load"])}else{onStatus("Neural voices ready",100,true)};return}
  guard let(executable,script)=runtime else{onError("The neural voice runtime is missing. Install the current Thread beta from the website.");return}
  do{
   try FileManager.default.createDirectory(at:Self.root,withIntermediateDirectories:true,attributes:[.posixPermissions:0o700]);try FileManager.default.setAttributes([.posixPermissions:0o700],ofItemAtPath:Self.root.path);var folder=Self.root;var values=URLResourceValues();values.isExcludedFromBackup=true;try? folder.setResourceValues(values)
   let task=Process(),stdin=Pipe(),stdout=Pipe(),stderr=Pipe();task.executableURL=executable;task.arguments=[script.path,Self.root.path];task.currentDirectoryURL=Self.root;task.environment=["HOME":NSHomeDirectory(),"TMPDIR":NSTemporaryDirectory(),"PATH":"/usr/bin:/bin","LANG":"en_US.UTF-8","NODE_NO_WARNINGS":"1"]
   task.standardInput=stdin;task.standardOutput=stdout;task.standardError=stderr
   input=stdin.fileHandleForWriting;output=stdout.fileHandleForReading;errors=stderr.fileHandleForReading;process=task;buffer=Data();ready=false
   output?.readabilityHandler={[weak self] handle in let data=handle.availableData;guard !data.isEmpty else{handle.readabilityHandler=nil;return};Task{@MainActor in guard self?.process===task else{return};self?.receive(data)}}
   errors?.readabilityHandler={handle in if handle.availableData.isEmpty{handle.readabilityHandler=nil}}
   task.terminationHandler={[weak self] task in Task{@MainActor in guard let self,self.process===task else{return};self.ready=false;self.output?.readabilityHandler=nil;self.errors?.readabilityHandler=nil;self.output=nil;self.errors=nil;self.process=nil;self.input=nil;self.onStatus("Voice engine stopped",0,false);self.onError("Neural voice stopped unexpectedly. Open Voice settings and try again.")}}
   onStatus(Self.isInstalled ? "Warming up neural voices":"Downloading neural voice pack",0,false);try task.run();send(["type":"load"])
  }catch{shutdown();onError("The neural voice engine could not start. Reinstall the current beta and retry.")}
 }
 func speak(id:String,text:String,voice:String,speed:Double){lastSpeechID=id;let command:[String:Any]=["type":"speak","id":id,"text":text,"voice":voice,"speed":speed];if ready{send(command)}else{pending=command;load()}}
 func cancel(_ id:String){if lastSpeechID==id{lastSpeechID=nil};if pending?["id"] as? String==id{pending=nil};send(["type":"cancel","id":id])}
 func shutdown(){send(["type":"shutdown"]);let task=process;process=nil;ready=false;pending=nil;output?.readabilityHandler=nil;errors?.readabilityHandler=nil;try? input?.close();input=nil;output=nil;errors=nil;if task?.isRunning==true{task?.terminate()}}
 private func send(_ command:[String:Any]){guard let input,let data=try? JSONSerialization.data(withJSONObject:command) else{return};do{try input.write(contentsOf:data+Data([10]))}catch{onError("The neural voice engine disconnected. Open Voice settings to restart it.")}}
 private func receive(_ data:Data){buffer.append(data);while let end=buffer.firstIndex(of:10){let line=buffer[..<end];buffer.removeSubrange(...end);guard line.count<20000,let event=(try? JSONSerialization.jsonObject(with:line)) as? [String:Any],let type=event["type"] as? String else{continue}
   switch type{
   case "progress":onStatus(event["message"] as? String ?? "Preparing neural voices",event["percent"] as? Int ?? 0,false)
   case "ready":ready=true;onStatus("Neural voices ready",100,true);if let command=pending{pending=nil;send(command)}
   case "audio":if let id=event["id"] as? String,let value=event["path"] as? String{let url=URL(fileURLWithPath:value).standardizedFileURL;let directory=Self.root.appendingPathComponent("audio").standardizedFileURL.path+"/";if url.path.hasPrefix(directory),url.pathExtension=="wav"{onAudio(id,url)}}
   case "done":if let id=event["id"] as? String{onDone(id)}
   case "error":if let id=event["id"] as? String,id != lastSpeechID{continue};onStatus("Neural voice needs attention",0,false);onError(event["message"] as? String ?? "Neural voice could not finish. Try again in Voice settings.")
   default:break
   }
  };if buffer.count>200000{buffer=Data()}}
}
struct NeuralVoiceOption:Identifiable{let id:String;let name:String;let detail:String
 static let all=[NeuralVoiceOption(id:"af_heart",name:"Heart",detail:"Warm · American"),NeuralVoiceOption(id:"af_bella",name:"Bella",detail:"Bright · American"),NeuralVoiceOption(id:"af_nicole",name:"Nicole",detail:"Soft · American"),NeuralVoiceOption(id:"am_michael",name:"Michael",detail:"Calm · American"),NeuralVoiceOption(id:"bf_emma",name:"Emma",detail:"Clear · British"),NeuralVoiceOption(id:"bm_george",name:"George",detail:"Steady · British")]
}
