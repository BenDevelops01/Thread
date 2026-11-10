import AppKit
import SwiftUI
import AVFoundation
import Carbon

final class BubblePanel:NSPanel {override var canBecomeKey:Bool{true};override var canBecomeMain:Bool{false}}
final class PetPanel:NSPanel {override var canBecomeKey:Bool{false};override var canBecomeMain:Bool{false}}
final class PetHostingView:NSHostingView<PetView>{
 var pressedAt=NSPoint.zero;var original=NSPoint.zero;var moved=false
 var onDrag:()->Void={};var onClick:()->Void={}
 override func hitTest(_ point:NSPoint)->NSView?{bounds.contains(point) ? self:nil}
 override func mouseDown(with event:NSEvent){pressedAt=NSEvent.mouseLocation;original=window?.frame.origin ?? .zero;moved=false}
 override func mouseDragged(with event:NSEvent){let p=NSEvent.mouseLocation;let dx=p.x-pressedAt.x,dy=p.y-pressedAt.y;if abs(dx)+abs(dy)>4{moved=true;onDrag();window?.setFrameOrigin(NSPoint(x:original.x+dx,y:original.y+dy))}}
 override func mouseUp(with event:NSEvent){if !moved{onClick()}}
}
@MainActor final class AppDelegate:NSObject,NSApplicationDelegate,NSWindowDelegate {
 let model=BuddyModel();var voice:VoiceController!;var bubble:BubblePanel!;var bubbleHost:NSHostingView<PetBubble>!
 var pet:PetPanel!;var conversation:NSWindow!;var statusItem:NSStatusItem!;var timer:Timer?;var observer:NSObjectProtocol?;var hotKey:EventHotKeyRef?
 var ticks=0;var aim=NSPoint.zero;var lastBuddy="";var petVisible=true
 func applicationDidFinishLaunching(_ notification:Notification){
  NSApp.setActivationPolicy(.accessory)
  let mainMenu=NSMenu();let appItem=NSMenuItem();let appMenu=NSMenu();appMenu.addItem(withTitle:"Quit Thread",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q");appMenu.items.first?.target=NSApp;let settingsItem=NSMenuItem(title:"Settings & setup…",action:#selector(show),keyEquivalent:",");settingsItem.target=self;appMenu.insertItem(settingsItem,at:0);appMenu.insertItem(.separator(),at:1);appItem.submenu=appMenu;mainMenu.addItem(appItem)
  let fileItem=NSMenuItem();let fileMenu=NSMenu(title:"File");fileMenu.addItem(withTitle:"Close Window",action:#selector(NSWindow.performClose(_:)),keyEquivalent:"w");fileItem.submenu=fileMenu;mainMenu.addItem(fileItem)
  let editItem=NSMenuItem();let edit=NSMenu(title:"Edit");for (title,action,key) in [("Undo","undo:","z"),("Cut","cut:","x"),("Copy","copy:","c"),("Paste","paste:","v"),("Select All","selectAll:","a")]{edit.addItem(withTitle:title,action:Selector(action),keyEquivalent:key)};editItem.submenu=edit;mainMenu.addItem(editItem);NSApp.mainMenu=mainMenu
  conversation=NSWindow(contentRect:NSRect(x:0,y:0,width:950,height:740),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false);conversation.title="Thread — Setup & Settings";conversation.minSize=NSSize(width:840,height:650);conversation.isReleasedWhenClosed=false;conversation.delegate=self;conversation.contentView=NSHostingView(rootView:ConversationView(model:model));conversation.center()
  pet=PetPanel(contentRect:NSRect(x:0,y:0,width:200,height:245),styleMask:[.borderless,.nonactivatingPanel],backing:.buffered,defer:false);pet.backgroundColor = .clear;pet.isOpaque=false;pet.hasShadow=false;pet.level = .floating;pet.collectionBehavior=[.canJoinAllSpaces,.fullScreenAuxiliary,.ignoresCycle];pet.hidesOnDeactivate=false;pet.isReleasedWhenClosed=false
  let view=PetHostingView(rootView:PetView(model:model));view.onClick={[weak self] in self?.talk()};view.onDrag={[weak self] in self?.model.follow=false};pet.contentView=view
  let screen=NSScreen.main?.visibleFrame ?? NSRect(x:0,y:0,width:1280,height:800);pet.setFrameOrigin(NSPoint(x:screen.maxX-230,y:screen.minY+40));pet.orderFrontRegardless();aim=pet.frame.origin
  voice=VoiceController(model:model)
  bubble=BubblePanel(contentRect:NSRect(x:0,y:0,width:410,height:300),styleMask:[.borderless,.nonactivatingPanel],backing:.buffered,defer:false);bubble.isOpaque=false;bubble.backgroundColor = .clear;bubble.hasShadow=true;bubble.hidesOnDeactivate=false;bubble.level = .floating;bubble.collectionBehavior=[.canJoinAllSpaces,.fullScreenAuxiliary];bubble.isReleasedWhenClosed=false
  bubbleHost=NSHostingView(rootView:PetBubble(model:model,voice:voice,close:{[weak self] in self?.bubble.orderOut(nil)}));bubble.contentView=bubbleHost
  model.closeConversation={[weak self] in self?.conversation.close()};model.showConversation={[weak self] in self?.show()};model.showBubble={[weak self] in self?.presentBubble()}
  model.beforeAction={[weak self] in self?.bubble.orderOut(nil);self?.pet.orderOut(nil)};model.afterAction={[weak self] in guard let self else{return};if self.petVisible{self.pet.orderFrontRegardless()};self.presentBubble();if self.voice.active,self.model.plan.isEmpty{self.voice.start()}}
  model.applyAppearance()
  rememberApp(NSWorkspace.shared.frontmostApplication)
  observer=NSWorkspace.shared.notificationCenter.addObserver(forName:NSWorkspace.didActivateApplicationNotification,object:nil,queue:.main){[weak self] note in Task{@MainActor in self?.rememberApp(note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication)}}
  timer=Timer.scheduledTimer(withTimeInterval:1/30,repeats:true){[weak self]_ in Task{@MainActor in self?.tick()}}
  statusItem=NSStatusBar.system.statusItem(withLength:NSStatusItem.squareLength);statusItem.button?.image=NSImage(systemSymbolName:"pawprint.fill",accessibilityDescription:"Thread Beta");let menu=NSMenu();menu.addItem(withTitle:"Talk to your buddy     ⌥⌘Space",action:#selector(talk),keyEquivalent:"");menu.addItem(withTitle:"Settings & setup…",action:#selector(show),keyEquivalent:",");menu.addItem(withTitle:"Stop speaking / listening",action:#selector(stopVoice),keyEquivalent:"");menu.addItem(withTitle:"Follow active window",action:#selector(follow),keyEquivalent:"");menu.addItem(withTitle:"Stay here",action:#selector(stay),keyEquivalent:"");menu.addItem(withTitle:"Show / hide pet",action:#selector(togglePet),keyEquivalent:"");menu.addItem(.separator());menu.addItem(withTitle:"Quit Thread",action:#selector(quit),keyEquivalent:"q");for item in menu.items{item.target=self};statusItem.menu=menu
  let id=EventHotKeyID(signature:0x54485244,id:1);let hotKeyStatus=RegisterEventHotKey(49,UInt32(cmdKey|optionKey),id,GetApplicationEventTarget(),0,&hotKey);if hotKeyStatus != noErr{model.notice="The global shortcut is already in use, possibly by another Thread copy. Click the pet to talk, or quit the other copy and reopen Thread."}
  let pointer=Unmanaged.passUnretained(self).toOpaque();var type=EventTypeSpec(eventClass:OSType(kEventClassKeyboard),eventKind:UInt32(kEventHotKeyPressed));InstallEventHandler(GetApplicationEventTarget(),{_,_,data in guard let data else{return noErr};let app=Unmanaged<AppDelegate>.fromOpaque(data).takeUnretainedValue();DispatchQueue.main.async{app.talk()};return noErr},1,&type,pointer,nil)
  if !model.setupComplete || !model.signedIn{show()};if model.signedIn{Task{await model.refresh();if !model.signedIn{show()}}}
 }
 func rememberApp(_ app:NSRunningApplication?){guard let app,app.processIdentifier != ProcessInfo.processInfo.processIdentifier,app.activationPolicy == .regular else{return};model.targetApplication=app;model.targetName=app.localizedName ?? "your active app"}
 func positionBubble(){guard bubble.isVisible else{return};let screen=NSScreen.screens.first(where:{$0.frame.intersects(pet.frame)}) ?? NSScreen.main!;let area=screen.visibleFrame;let height=min(620,max(200,bubbleHost.fittingSize.height));bubble.setContentSize(NSSize(width:410,height:height));let x=min(max(pet.frame.midX-205,area.minX+12),area.maxX-422),y=min(max(pet.frame.maxY+8,area.minY+12),area.maxY-height-12);bubble.setFrameOrigin(NSPoint(x:x,y:y))}
 func presentBubble(){bubble.makeKeyAndOrderFront(nil);positionBubble()}
 @objc func talk(){presentBubble();if model.setupComplete,model.signedIn{voice.toggle()}}
 @objc func stopVoice(){voice.stop()}
 @objc func show(){conversation.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)}
 @objc func follow(){model.follow=true;petVisible=true;pet.orderFrontRegardless()}
 @objc func stay(){model.follow=false}
 @objc func togglePet(){petVisible.toggle();if petVisible{pet.orderFrontRegardless()}else{pet.orderOut(nil)}}
 @objc func quit(){NSApp.terminate(nil)}
 func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool{false}
 func windowWillClose(_ notification:Notification){}
 func tick(){ticks+=1;if ticks%5==0{positionBubble()};guard model.follow,petVisible,!bubble.isVisible else{return}
  if ticks%20==0 {
   let pointer=NSEvent.mouseLocation;let screen=NSScreen.screens.first(where:{$0.frame.contains(pointer)}) ?? NSScreen.main!;let visible=screen.visibleFrame
   var x=visible.maxX-220,y=visible.minY+35
   if let r=DesktopTools.bounds(for:model.targetApplication){let globalTop=NSScreen.screens.first?.frame.maxY ?? screen.frame.maxY;x=r.maxX-200;y=globalTop-r.maxY-55}
   if !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion{x+=sin(Double(ticks)/130)*35}
   aim=NSPoint(x:min(max(x,visible.minX),visible.maxX-200),y:min(max(y,visible.minY),visible.maxY-245))
  }
  let p=pet.frame.origin;let reduced=NSWorkspace.shared.accessibilityDisplayShouldReduceMotion;let next=reduced ? aim:NSPoint(x:p.x+(aim.x-p.x)*0.06,y:p.y+(aim.y-p.y)*0.06)
  if abs(next.x-p.x)>0.1||abs(next.y-p.y)>0.1{pet.setFrameOrigin(next)}
 }
 func applicationWillTerminate(_ notification:Notification){voice.shutdown();ScreenOverlay.shared.clear();timer?.invalidate();if let observer{NSWorkspace.shared.notificationCenter.removeObserver(observer)};if let hotKey{UnregisterEventHotKey(hotKey)}}
}
@main struct ThreadMain{static func main(){let app=NSApplication.shared;let delegate=AppDelegate();app.delegate=delegate;withExtendedLifetime(delegate){app.run()}}}
