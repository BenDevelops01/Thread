import AppKit
import ScreenCaptureKit
import SwiftUI
struct ScreenSnapshot {
 let jpeg:Data;let width:Int;let height:Int;let bounds:CGRect;let targetPID:pid_t?;let windowBounds:CGRect?;let capturedAt:Date
 var image:NSImage?{NSImage(data:jpeg)}
 func point(x:Double,y:Double)->CGPoint{CGPoint(x:bounds.minX+x*max(0,bounds.width-1),y:bounds.minY+y*max(0,bounds.height-1))}
 var isRecent:Bool{Date().timeIntervalSince(capturedAt)<45}
}
@MainActor enum ScreenContext {
 static func capture(target:NSRunningApplication?) async throws -> ScreenSnapshot {
  guard CGPreflightScreenCaptureAccess() else{throw APIError(message:"Enable Screen Recording in Permissions before sharing a screenshot. Nothing has been captured.")}
  let content=try await SCShareableContent.excludingDesktopWindows(false,onScreenWindowsOnly:true)
  let mouse=NSEvent.mouseLocation;let screen=NSScreen.screens.first(where:{$0.frame.contains(mouse)}) ?? NSScreen.main
  let id=screen?.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
  guard let display=content.displays.first(where:{$0.displayID==id}) ?? content.displays.first else{throw APIError(message:"No shareable screen is available.")}
  let filter=SCContentFilter(display:display,excludingApplications:content.applications.filter{$0.processID==ProcessInfo.processInfo.processIdentifier},exceptingWindows:[])
  let config=SCStreamConfiguration();let bounds=CGDisplayBounds(display.displayID);config.width=min(1440,display.width);config.height=Int(Double(config.width)*Double(display.height)/Double(display.width));config.showsCursor=false;config.scalesToFit=true
  let image=try await SCScreenshotManager.captureImage(contentFilter:filter,configuration:config)
  let rep=NSBitmapImageRep(cgImage:image)
  guard let jpeg=rep.representation(using:.jpeg,properties:[.compressionFactor:0.63]),jpeg.count<1_200_000 else{throw APIError(message:"This screenshot is too large. Use selected text instead, or reduce display resolution.")}
  return ScreenSnapshot(jpeg:jpeg,width:image.width,height:image.height,bounds:bounds,targetPID:target?.processIdentifier,windowBounds:DesktopTools.bounds(for:target),capturedAt:Date())
 }
 static func ensureFresh(_ snapshot:ScreenSnapshot,target:NSRunningApplication?) throws {
  guard snapshot.isRecent else{throw APIError(message:"That screenshot is over 45 seconds old. Share a fresh screen before approving this action.")}
  guard snapshot.targetPID==target?.processIdentifier else{throw APIError(message:"The target app changed. Share your screen again.")}
  if let front=NSWorkspace.shared.frontmostApplication,front.processIdentifier != ProcessInfo.processInfo.processIdentifier,front.processIdentifier != snapshot.targetPID{throw APIError(message:"You switched apps. Share a fresh screen before approving the click.")}
  if let old=snapshot.windowBounds,let current=DesktopTools.bounds(for:target),abs(old.minX-current.minX)+abs(old.minY-current.minY)+abs(old.width-current.width)+abs(old.height-current.height)>8{throw APIError(message:"The window moved since the screenshot. Share it again before clicking.")}
 }
}
struct ScreenMarks:View {
 let actions:[DesktopAction]
 var body:some View{GeometryReader{g in ZStack(alignment:.topLeading){ForEach(actions){a in
  if let x=a.x,let y=a.y {
   if a.type=="arrow",let x2=a.x2,let y2=a.y2 {Path{p in let start=CGPoint(x:x*g.size.width,y:y*g.size.height),end=CGPoint(x:x2*g.size.width,y:y2*g.size.height);p.move(to:start);p.addLine(to:end);let angle=atan2(end.y-start.y,end.x-start.x);for off in [-0.5,0.5]{p.move(to:end);p.addLine(to:CGPoint(x:end.x-18*cos(angle+off),y:end.y-18*sin(angle+off)))}}.stroke(Color(red:0.32,green:0.55,blue:1),style:StrokeStyle(lineWidth:4,lineCap:.round))}
   else{RoundedRectangle(cornerRadius:8).stroke(Color(red:0.32,green:0.55,blue:1),style:StrokeStyle(lineWidth:3,dash:a.type=="click" ? [6,4]:[])).background(Color.blue.opacity(0.08),in:RoundedRectangle(cornerRadius:8)).frame(width:max(24,(a.w ?? 0.035)*g.size.width),height:max(24,(a.h ?? 0.035)*g.size.height)).offset(x:x*g.size.width,y:y*g.size.height)}
   Text(a.type=="click" ? "Confirm this click in the pet bubble":String((a.text ?? a.explanation ?? "Look here").prefix(70))).font(.system(size:12,weight:.medium)).padding(.horizontal,11).padding(.vertical,7).background(.blue,in:Capsule()).foregroundStyle(.white).offset(x:min(x*g.size.width,g.size.width-260),y:max(5,y*g.size.height-38))
  }
 }}}.allowsHitTesting(false)}
}
@MainActor final class ScreenOverlay {
 static let shared=ScreenOverlay();var panel:NSPanel?;var generation=UUID()
 func show(_ actions:[DesktopAction],snapshot:ScreenSnapshot){
  clear();let token=UUID();generation=token;let top=NSScreen.screens.first?.frame.maxY ?? snapshot.bounds.maxY
  let frame=NSRect(x:snapshot.bounds.minX,y:top-snapshot.bounds.maxY,width:snapshot.bounds.width,height:snapshot.bounds.height)
  let panel=NSPanel(contentRect:frame,styleMask:[.borderless,.nonactivatingPanel],backing:.buffered,defer:false);panel.isOpaque=false;panel.backgroundColor = .clear;panel.hasShadow=false;panel.ignoresMouseEvents=true;panel.level = .statusBar;panel.collectionBehavior=[.canJoinAllSpaces,.fullScreenAuxiliary];panel.contentView=NSHostingView(rootView:ScreenMarks(actions:actions));panel.orderFrontRegardless();self.panel=panel
  Task{try? await Task.sleep(for:.seconds(10));if generation==token{clear()}}
 }
 func clear(){panel?.orderOut(nil);panel=nil;generation=UUID()}
}
