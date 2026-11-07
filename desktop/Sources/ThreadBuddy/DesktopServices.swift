import AppKit
import SwiftUI
import Speech
import AVFoundation
import Vision
import ApplicationServices

@MainActor final class Dictation:NSObject,ObservableObject {
 @Published var recording=false
 @Published var error=""
 private let engine=AVAudioEngine()
 private var task:SFSpeechRecognitionTask?
 private var request:SFSpeechAudioBufferRecognitionRequest?
 private var installed=false
 var onText:(String)->Void={_ in}
 func toggle(){if recording{stop();return};Task{await start()}}
 func start() async {
  error=""
  let speech=await withCheckedContinuation{c in SFSpeechRecognizer.requestAuthorization{c.resume(returning:$0)}}
  guard speech == .authorized else{error="Enable Speech Recognition for Thread in System Settings → Privacy & Security.";return}
  let microphone=await AVCaptureDevice.requestAccess(for:.audio)
  guard microphone else{error="Enable Microphone access for Thread in System Settings → Privacy & Security.";return}
  guard let recognizer=SFSpeechRecognizer(locale:Locale.current),recognizer.isAvailable,recognizer.supportsOnDeviceRecognition else{error="On-device dictation isn’t available for this language. Enable/download your language in macOS Dictation settings, or type your message.";return}
  stop();let req=SFSpeechAudioBufferRecognitionRequest();req.shouldReportPartialResults=true;req.requiresOnDeviceRecognition=true;request=req
  let input=engine.inputNode;let format=input.outputFormat(forBus:0)
  guard format.sampleRate>0,format.channelCount>0 else{error="No microphone input is available.";return}
  input.installTap(onBus:0,bufferSize:1024,format:format){buffer,_ in req.append(buffer)};installed=true
  do{engine.prepare();try engine.start();recording=true;task=recognizer.recognitionTask(with:req){[weak self] result,e in Task{@MainActor in
   guard self?.request === req else{return}
   if let result{self?.onText(result.bestTranscription.formattedString);if result.isFinal{self?.stop()}}
   if let e{self?.error=e.localizedDescription;self?.stop()}
  }};Task{try? await Task.sleep(for:.seconds(55));if self.request === req{self.stop()}}
  }catch{self.error=error.localizedDescription;stop()}
 }
 func stop(){if engine.isRunning{engine.stop()};if installed{engine.inputNode.removeTap(onBus:0);installed=false};request?.endAudio();task?.cancel();request=nil;task=nil;recording=false}
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
 static func execute(_ action:DesktopAction,target:NSRunningApplication?) throws {
  _ = try action.validated()
  if action.type=="open_url",let value=action.url,let u=URL(string:value){NSWorkspace.shared.open(u);return}
  guard trusted else{throw APIError(message:"Enable Thread in System Settings → Privacy & Security → Accessibility, then approve the action again.")}
  guard let target,!target.isTerminated,target.processIdentifier != ProcessInfo.processInfo.processIdentifier else{throw APIError(message:"Switch to the app you want to change, then return to Thread.")}
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
 static func screenText() async throws -> String {
  guard CGPreflightScreenCaptureAccess() else{CGRequestScreenCaptureAccess();throw APIError(message:"Enable Screen Recording for Thread in System Settings, then try again. Nothing was captured.")}
  guard let display=NSScreen.main?.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID,let image=CGDisplayCreateImage(display) else{throw APIError(message:"Unable to capture this display.")}
  return try await Task.detached(priority:.userInitiated){let r=VNRecognizeTextRequest();r.recognitionLevel = .accurate;try VNImageRequestHandler(cgImage:image).perform([r]);return String((r.results ?? []).compactMap{$0.topCandidates(1).first?.string}.joined(separator:"\n").prefix(5000))}.value
 }
}
