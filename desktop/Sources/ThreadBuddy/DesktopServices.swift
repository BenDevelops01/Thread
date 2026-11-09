import AppKit
import SwiftUI
import Speech
import AVFoundation
import ApplicationServices

@MainActor final class Dictation:NSObject,ObservableObject {
 @Published var recording=false
 @Published var error=""
 private let engine=AVAudioEngine()
 private var task:SFSpeechRecognitionTask?
 private var request:SFSpeechAudioBufferRecognitionRequest?
 private var installed=false
 var onText:(String)->Void={_ in}
 var onFinal:(String)->Void={_ in}
 var silence:DispatchWorkItem?
 var latest=""
 var generation=0
 var onEnded:(String)->Void={_ in}
 var autoSubmit=false
 var allowAppleService=false
 func toggle(){if recording{stop();return};Task{await start()}}
 func start() async {
  stop();let startGeneration=generation;error=""
  let speech=await withCheckedContinuation{c in SFSpeechRecognizer.requestAuthorization{c.resume(returning:$0)}}
  guard generation==startGeneration else{return}
  guard speech == .authorized else{error="Enable Speech Recognition for Thread in System Settings → Privacy & Security.";return}
  let microphone=await AVCaptureDevice.requestAccess(for:.audio)
  guard generation==startGeneration else{return}
  guard microphone else{error="Enable Microphone access for Thread in System Settings → Privacy & Security.";return}
  guard let recognizer=SFSpeechRecognizer(locale:Locale.current),recognizer.isAvailable else{error="Apple speech recognition is unavailable. Check your Dictation language in System Settings.";return}
  guard recognizer.supportsOnDeviceRecognition||allowAppleService else{error="On-device speech is unavailable for this language. Enable Apple speech-service fallback in Permissions, or use the typed pet prompt.";return}
  latest="";let req=SFSpeechAudioBufferRecognitionRequest();req.shouldReportPartialResults=true;req.requiresOnDeviceRecognition=recognizer.supportsOnDeviceRecognition;request=req
  let input=engine.inputNode;let format=input.outputFormat(forBus:0)
  guard format.sampleRate>0,format.channelCount>0 else{error="No microphone input is available.";return}
  input.installTap(onBus:0,bufferSize:1024,format:format){buffer,_ in req.append(buffer)};installed=true
  do{engine.prepare();try engine.start();recording=true;task=recognizer.recognitionTask(with:req){[weak self] result,e in Task{@MainActor in
   guard self?.request === req else{return}
   if let result,let self{let text=result.bestTranscription.formattedString;self.latest=text;self.onText(text);self.silence?.cancel();if self.autoSubmit,!text.isEmpty{let work=DispatchWorkItem{Task{@MainActor in guard self.recording else{return};let final=self.latest;self.stop();self.onFinal(final)}};self.silence=work;DispatchQueue.main.asyncAfter(deadline:.now()+1.5,execute:work)};if result.isFinal{let final=self.latest;self.stop();if self.autoSubmit{self.onFinal(final)}}}
   if let e,let self{self.error=e.localizedDescription;self.stop();self.onEnded(self.error)}
  }};Task{try? await Task.sleep(for:.seconds(55));if self.request === req{self.stop();self.onEnded("Voice paused after 55 seconds. Tap the microphone to continue.")}}
  }catch{self.error=error.localizedDescription;stop()}
 }
 func stop(){generation+=1;silence?.cancel();silence=nil;if engine.isRunning{engine.stop()};if installed{engine.inputNode.removeTap(onBus:0);installed=false};request?.endAudio();task?.cancel();request=nil;task=nil;recording=false}
}
@MainActor final class DesktopTools {
 static var trusted:Bool{AXIsProcessTrusted()}
 static func requestPermission(){let options=[kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String:true] as CFDictionary;_ = AXIsProcessTrustedWithOptions(options)}
 static func bounds(for app:NSRunningApplication?) -> CGRect? {
  guard let pid=app?.processIdentifier,let rows=CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID) as? [[String:Any]] else{return nil}
  for row in rows where (row[kCGWindowOwnerPID as String] as? Int32)==pid && (row[kCGWindowLayer as String] as? Int)==0 {
   if let b=row[kCGWindowBounds as String] as? [String:Any],let rect=CGRect(dictionaryRepresentation:b as CFDictionary),rect.width>180,rect.height>120{return rect}
  };return nil
 }
 static func focusedWindow(_ app:NSRunningApplication) throws -> AXUIElement {
  let ax=AXUIElementCreateApplication(app.processIdentifier);var value:CFTypeRef?
  guard AXUIElementCopyAttributeValue(ax,kAXFocusedWindowAttribute as CFString,&value) == .success,let value,CFGetTypeID(value)==AXUIElementGetTypeID() else{throw APIError(message:"This app doesn’t expose a movable window. Select a normal window and try again.")}
  return unsafeBitCast(value,to:AXUIElement.self)
 }
 static func execute(_ action:DesktopAction,target:NSRunningApplication?,snapshot:ScreenSnapshot?=nil) throws {
  _ = try action.validated()
  if action.type=="open_url",let value=action.url,let u=URL(string:value){NSWorkspace.shared.open(u);return}
  if ["highlight","arrow"].contains(action.type){guard let snapshot else{throw APIError(message:"No screenshot to annotate.")};ScreenOverlay.shared.show([action],snapshot:snapshot);return}
  guard trusted else{throw APIError(message:"Enable Thread in System Settings → Privacy & Security → Accessibility, then approve the action again.")}
  guard let target,!target.isTerminated,target.processIdentifier != ProcessInfo.processInfo.processIdentifier else{throw APIError(message:"Switch to the app you want to change, then return to Thread.")}
  if ["click","scroll"].contains(action.type){
   guard let snapshot,let x=action.x,let y=action.y else{throw APIError(message:"Share your screen first.")};try ScreenContext.ensureFresh(snapshot,target:target)
   let point=snapshot.point(x:x,y:y)
   var hit:AXUIElement?;if AXUIElementCopyElementAtPosition(AXUIElementCreateSystemWide(),Float(point.x),Float(point.y),&hit) == .success,let hit{var hitPID:pid_t=0;guard AXUIElementGetPid(hit,&hitPID) == .success,hitPID==target.processIdentifier else{throw APIError(message:"That point belongs to a different app. Focus it and share a fresh screenshot first.")};var role:CFTypeRef?;AXUIElementCopyAttributeValue(hit,kAXSubroleAttribute as CFString,&role);if role as? String=="AXSecureTextField"{throw APIError(message:"Thread won’t interact with password fields.")}}else{throw APIError(message:"The target element could not be verified. Click it yourself or share a fresh screenshot.")}
   guard let source=CGEventSource(stateID:.hidSystemState) else{throw APIError(message:"Unable to create a macOS input event.")}
   if action.type=="click"{CGEvent(mouseEventSource:source,mouseType:.leftMouseDown,mouseCursorPosition:point,mouseButton:.left)?.post(tap:.cghidEventTap);CGEvent(mouseEventSource:source,mouseType:.leftMouseUp,mouseCursorPosition:point,mouseButton:.left)?.post(tap:.cghidEventTap)}
   else{guard let event=CGEvent(scrollWheelEvent2Source:source,units:.line,wheelCount:1,wheel1:Int32(action.amount ?? 0),wheel2:0,wheel3:0) else{throw APIError(message:"Unable to scroll.")};event.location=point;event.post(tap:.cghidEventTap)}
   return
  }
  if action.type=="move_window" {
   let window=try focusedWindow(target);let visible=NSScreen.main?.visibleFrame ?? CGRect(x:0,y:0,width:1280,height:800)
   var frame=visible
   switch action.layout {case "left":frame.size.width/=2;case "right":frame.size.width/=2;frame.origin.x+=frame.width;case "center":frame=visible.insetBy(dx:visible.width*0.15,dy:visible.height*0.15);default:break}
   var position=CGPoint(x:frame.minX,y:(NSScreen.screens.first?.frame.maxY ?? visible.maxY)-frame.maxY);var size=frame.size
   let p=AXValueCreate(.cgPoint,&position)!,s=AXValueCreate(.cgSize,&size)!
   guard AXUIElementSetAttributeValue(window,kAXSizeAttribute as CFString,s) == .success,AXUIElementSetAttributeValue(window,kAXPositionAttribute as CFString,p) == .success else{throw APIError(message:"The app rejected that window layout. Some windows enforce a minimum size or cannot move in full screen.")}
  }else if action.type=="type_text" {
   let app=AXUIElementCreateApplication(target.processIdentifier);var focused:CFTypeRef?
   guard AXUIElementCopyAttributeValue(app,kAXFocusedUIElementAttribute as CFString,&focused) == .success,let focused,CFGetTypeID(focused)==AXUIElementGetTypeID() else{throw APIError(message:"Select an editable text field in the target app first.")}
   let element=unsafeBitCast(focused,to:AXUIElement.self);var role:CFTypeRef?;AXUIElementCopyAttributeValue(element,kAXSubroleAttribute as CFString,&role)
   guard (role as? String) != "AXSecureTextField" else{throw APIError(message:"Thread won’t insert text into password fields.")}
   var editable:DarwinBoolean=false;AXUIElementIsAttributeSettable(element,kAXSelectedTextAttribute as CFString,&editable)
   guard editable.boolValue,AXUIElementSetAttributeValue(element,kAXSelectedTextAttribute as CFString,(action.text ?? "") as CFString) == .success else{throw APIError(message:"This field doesn’t support safe text insertion. Copy the suggested text instead.")}
  }
 }
 static func readSelectedText(_ app:NSRunningApplication?) throws -> String {
  guard trusted,let app else{throw APIError(message:"Select text in another app and enable Accessibility first.")}
  let ax=AXUIElementCreateApplication(app.processIdentifier);var focused:CFTypeRef?
  guard AXUIElementCopyAttributeValue(ax,kAXFocusedUIElementAttribute as CFString,&focused) == .success,let focused,CFGetTypeID(focused)==AXUIElementGetTypeID() else{throw APIError(message:"No selected text found.")}
  let el=unsafeBitCast(focused,to:AXUIElement.self);var role:CFTypeRef?;AXUIElementCopyAttributeValue(el,kAXSubroleAttribute as CFString,&role)
  guard (role as? String) != "AXSecureTextField" else{throw APIError(message:"Password fields are never read.")}
  var selected:CFTypeRef?;guard AXUIElementCopyAttributeValue(el,kAXSelectedTextAttribute as CFString,&selected) == .success,let text=selected as? String,!text.isEmpty else{throw APIError(message:"Highlight some text in the other app first.")};return String(text.prefix(5000))
 }
}
