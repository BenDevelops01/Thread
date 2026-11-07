import SwiftUI
import AppKit
@MainActor final class ConversationState:ObservableObject {
 @Published var tab:String="Talk"
 @Published var email:String=""
 @Published var password:String=""
 @Published var signup:Bool=false
 @Published var key:String=""
 @Published var code:String=""
 @Published var context:String=""
 @Published var contextBusy:Bool=false
}
struct ConversationView:View {
 @ObservedObject var model:BuddyModel
 @StateObject private var dictation=Dictation()
 @StateObject private var ui=ConversationState()
 var tab:String {get{ui.tab} nonmutating set{ui.tab=newValue}}
 var email:String {get{ui.email} nonmutating set{ui.email=newValue}}
 var password:String {get{ui.password} nonmutating set{ui.password=newValue}}
 var signup:Bool {get{ui.signup} nonmutating set{ui.signup=newValue}}
 var key:String {get{ui.key} nonmutating set{ui.key=newValue}}
 var code:String {get{ui.code} nonmutating set{ui.code=newValue}}
 var context:String {get{ui.context} nonmutating set{ui.context=newValue}}
 var contextBusy:Bool {get{ui.contextBusy} nonmutating set{ui.contextBusy=newValue}}
 var body:some View{
  HStack(spacing:0){
   VStack(alignment:.leading,spacing:19){
    HStack{Image(systemName:"sparkle").font(.title2);Text("thread").font(.system(size:26,weight:.bold,design:.rounded));Text("BETA").font(.system(size:9,weight:.semibold,design:.monospaced)).padding(5).background(.quaternary,in:RoundedRectangle(cornerRadius:4))}
    PetArtwork(kind:model.buddyID,color:model.buddy.color).frame(height:178).frame(maxWidth:.infinity)
    Text("Meet \(model.buddy.name).").font(.title2.bold())
    Text("A little company for whatever you’re figuring out.").font(.callout).foregroundStyle(.secondary).fixedSize(horizontal:false,vertical:true)
    HStack(spacing:8){ForEach(Buddy.all){buddy in Button{model.buddyID=buddy.id}label:{Circle().fill(buddy.color).frame(width:25,height:25).overlay(Circle().stroke(model.buddyID==buddy.id ? Color.primary:Color.clear,lineWidth:3)).padding(3)}.buttonStyle(.plain).help(buddy.name)}}
    Divider()
    ForEach(["Talk","Connections","Plan","Preferences"],id:\.self){name in Button{tab=name}label:{HStack{Image(systemName:icon(name)).frame(width:20);Text(name);Spacer()}.padding(10).background(tab==name ? Color.primary.opacity(0.08):.clear,in:RoundedRectangle(cornerRadius:8))}.buttonStyle(.plain)}
    Spacer(minLength:12)
    Label("⌥⌘Space to say hello",systemImage:"keyboard").font(.caption).foregroundStyle(.secondary)
    Text("Closing this window keeps your buddy running. Quit from the menu bar.").font(.caption).foregroundStyle(.secondary).fixedSize(horizontal:false,vertical:true)
   }.padding(24).frame(width:245).frame(maxHeight:.infinity).background(Color(nsColor:.windowBackgroundColor))
   Divider()
   VStack(alignment:.leading,spacing:0){
    HStack{VStack(alignment:.leading,spacing:5){Text(model.signedIn || tab=="Preferences" ? heading: "Your buddy is waiting.").font(.system(size:25,weight:.semibold,design:.rounded));Text(model.signedIn ? "Native Mac beta · your API key · your control":"Sign in to connect your AI. The pet can roam before you sign in.").font(.caption).foregroundStyle(.secondary)};Spacer();Button("Pet mode"){model.closeConversation()}.buttonStyle(.bordered).help("Close this window and keep your buddy running");if model.signedIn{Button("Sign out"){Task{await model.signOut()}}.buttonStyle(.borderless).disabled(model.busy)}}.padding(24)
    Divider()
    if tab=="Preferences"{preferences}else if !model.signedIn{auth}else{switch tab{case "Connections":connections;case "Plan":plan;case "Preferences":preferences;default:conversation}}
    if !model.notice.isEmpty{HStack(alignment:.top){Image(systemName:"info.circle");Text(model.notice).textSelection(.enabled).fixedSize(horizontal:false,vertical:true);Spacer();Button{model.notice=""}label:{Image(systemName:"xmark")}.buttonStyle(.plain)}.font(.caption).padding(14).background(Color.orange.opacity(0.10))}
   }.frame(maxWidth:.infinity,maxHeight:.infinity).background(Color(nsColor:.textBackgroundColor))
  }.frame(minWidth:850,minHeight:660).onAppear{model.stopDictation={dictation.stop()};dictation.onText={model.draft=$0}}.onDisappear{dictation.stop()}.onChange(of:dictation.error){_,e in if !e.isEmpty{model.notice=e}}
 }
 var heading:String{switch tab{case "Connections":return "Bring your favourite brain.";case "Plan":return "A little more room.";case "Preferences":return "Make yourself at home.";default:return "What are we figuring out?"}}
 func icon(_ name:String)->String{["Talk":"bubble.left.and.bubble.right","Connections":"key","Plan":"ticket","Preferences":"slider.horizontal.3"][name] ?? "circle"}
 var auth:some View{ScrollView{VStack(alignment:.leading,spacing:18){Text(signup ? "Create your Thread account":"Pick up the thread.").font(.title2.bold())
  TextField("Email address",text:$ui.email).textContentType(.username).textFieldStyle(.roundedBorder)
  SecureField("Password · at least 10 characters",text:$ui.password).textContentType(signup ? .newPassword:.password).textFieldStyle(.roundedBorder)
  Button{Task{await model.signIn(email:email,password:password,signup:signup);password=""}}label:{HStack{if model.busy{ProgressView().controlSize(.small)};Text(signup ? "Create account":"Sign in");Image(systemName:"arrow.up.right")}.frame(maxWidth:.infinity).padding(7)}.buttonStyle(.borderedProminent).tint(.primary).disabled(model.busy||email.isEmpty||password.count<10)
  Button(signup ? "Already have an account? Sign in":"New here? Create an account"){signup.toggle()}.buttonStyle(.link)
  Divider().padding(.vertical,7)
  Text("Your session stays in this running app’s memory. Provider API keys are encrypted in Supabase Vault; Thread doesn’t save them on your Mac.").font(.caption).foregroundStyle(.secondary).padding(.top,10)
  Link("Terms & privacy",destination:BuddyModel.site.appendingPathComponent("terms"))
 }.padding(30).frame(maxWidth:440)}}
 var conversation:some View{VStack(spacing:0){
  ScrollViewReader{proxy in ScrollView{LazyVStack(alignment:.leading,spacing:18){
   if model.messages.isEmpty{VStack(spacing:16){PetArtwork(kind:model.buddyID,color:model.buddy.color,animated:false).frame(height:150);Text("Hi, I’m \(model.buddy.name).").font(.title2);Text("Ask a question, dictate a thought, or share selected text from your current app.").foregroundStyle(.secondary).multilineTextAlignment(.center);Text("I only receive the context you choose to share.").font(.caption).foregroundStyle(.secondary)}.frame(maxWidth:.infinity).padding(35)}
   ForEach(model.messages){m in VStack(alignment:.leading,spacing:7){Text(m.role=="user" ? "YOU":model.buddy.name.uppercased()).font(.system(size:9,weight:.bold,design:.monospaced)).foregroundStyle(.secondary);Text(m.content).font(.system(size:14)).lineSpacing(5).textSelection(.enabled).fixedSize(horizontal:false,vertical:true)}.padding(17).frame(maxWidth:.infinity,alignment:.leading).background(m.role=="user" ? model.buddy.color.opacity(0.14):Color.primary.opacity(0.035),in:RoundedRectangle(cornerRadius:12)).id(m.id)}
   if model.busy{HStack{ProgressView().controlSize(.small);Text("\(model.buddy.name) is thinking…").foregroundStyle(.secondary)}.padding()}
   if !model.plan.isEmpty{actionPreview}
  }.padding(24)}.onChange(of:model.messages.count){_,_ in if let id=model.messages.last?.id{withAnimation{proxy.scrollTo(id,anchor:.bottom)}}}}
  Divider()
  VStack(alignment:.leading,spacing:12){
   HStack{Toggle("Suggest actions",isOn:$model.agentMode).toggleStyle(.switch).controlSize(.small);Spacer();Button("Clear chat"){model.messages=[];model.plan=[];context=""}.buttonStyle(.borderless).disabled(model.busy)}.font(.caption)
   if !context.isEmpty{DisclosureGroup("Shared context · \(context.count) characters"){Text(context).font(.caption).textSelection(.enabled).lineLimit(8);Button("Remove shared context"){context=""}}.font(.caption)}
   TextEditor(text:$model.draft).font(.system(size:14)).frame(minHeight:70,maxHeight:110).padding(8).background(Color.primary.opacity(0.035),in:RoundedRectangle(cornerRadius:8)).overlay(RoundedRectangle(cornerRadius:8).stroke(Color.primary.opacity(0.1))).accessibilityLabel("Message your buddy")
   HStack(spacing:12){Button{dictation.toggle()}label:{Label(dictation.recording ? "Stop dictation":"Dictate",systemImage:dictation.recording ? "stop.circle.fill":"mic")}.tint(dictation.recording ? .red:nil).help("Uses Apple’s on-device speech recognition when supported")
    Menu("Share context"){Button("Selected text from \(model.targetName)"){do{context=try DesktopTools.readSelectedText(model.targetApplication)}catch{model.notice=error.localizedDescription}};Button("Read screen text (OCR)"){contextBusy=true;Task{defer{contextBusy=false};do{context=try await DesktopTools.screenText();if context.isEmpty{model.notice="No readable text found on this display."}}catch{model.notice=error.localizedDescription}}}}.disabled(contextBusy)
    Spacer();Button{dictation.stop();Task{await model.send(context:context.isEmpty ? nil:context)}}label:{Label("Send",systemImage:"arrow.up")}.buttonStyle(.borderedProminent).tint(.primary).disabled(model.busy||model.draft.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty||model.draft.count>6000)
   }.controlSize(.regular)
   Text("\(dictation.recording ? "Listening on this Mac. Nothing sends until you press Send.":"Only shared text goes to your provider. AI can make mistakes.")").font(.system(size:10)).foregroundStyle(.secondary)
  }.padding(20)
 }}
 var actionPreview:some View{VStack(alignment:.leading,spacing:13){Label("Review before anything happens",systemImage:"hand.raised").font(.headline);Text("Target: \(model.planTarget?.localizedName ?? "the selected app"). Each action needs your approval. No terminal commands, automatic clicks or submission of forms.").font(.caption).foregroundStyle(.secondary)
  ForEach(model.plan){action in VStack(alignment:.leading,spacing:8){Text(action.label).font(.callout.bold());if let text=action.text{Text(text).font(.caption).textSelection(.enabled).lineLimit(8)};if let explanation=action.explanation{Text(explanation).font(.caption).foregroundStyle(.secondary)};HStack{Button("Approve this action"){do{try DesktopTools.execute(action,target:model.planTarget);model.plan.removeAll{$0.id==action.id};model.notice="Completed: \(action.label)"}catch{model.notice=error.localizedDescription}}.disabled(action.id != model.plan.first?.id);Button("Deny"){model.plan.removeAll{$0.id==action.id}}}}.padding(12).background(Color.primary.opacity(0.04),in:RoundedRectangle(cornerRadius:8))}
  Button("Deny all"){model.plan=[]}
 }.padding(16).background(Color.orange.opacity(0.08),in:RoundedRectangle(cornerRadius:12))}
 var connections:some View{ScrollView{VStack(alignment:.leading,spacing:20){Text("Connect your API key").font(.title2.bold());Text("Use your Codex subscription on this Mac, or connect a provider API key. API-key usage is billed separately by the provider.").foregroundStyle(.secondary).fixedSize(horizontal:false,vertical:true)
  Picker("Provider",selection:$model.provider){Text("My Codex subscription").tag("codex");Text("OpenAI").tag("openai");Text("Anthropic").tag("anthropic")}.onChange(of:model.provider){_,p in model.model=p=="codex" ? "Codex default":p=="openai" ? "gpt-4.1-mini":"claude-haiku-4-5";key=""}
  if model.provider=="codex"{Label("Use your existing ChatGPT sign-in",systemImage:"person.crop.circle.badge.checkmark");Text(model.codexStatus).font(.callout).foregroundStyle(.secondary).fixedSize(horizontal:false,vertical:true);Button("Check Codex connection"){Task{await model.checkCodex()}}.buttonStyle(.borderedProminent).tint(.primary).disabled(model.busy);Text("Requires the official Codex CLI or Codex app signed into ChatGPT. No OpenAI API key or API credit needed. Codex subscription limits apply. Thread never reads, copies or uploads your Codex credentials.").font(.caption).foregroundStyle(.secondary);Link("Install / sign in to Codex",destination:URL(string:"https://learn.chatgpt.com/docs/auth")!)}else{
  Label(model.status?.providers.contains(model.provider)==true ? "Connected":"Not connected",systemImage:model.status?.providers.contains(model.provider)==true ? "checkmark.seal":"key").foregroundStyle(.secondary)
  SecureField("Paste API key",text:$ui.key).textFieldStyle(.roundedBorder)
  Button("Save & test connection"){let value=key;key="";Task{await model.saveKey(value)}}.buttonStyle(.borderedProminent).tint(.primary).disabled(key.isEmpty||model.busy)
  Picker("Model",selection:$model.model){ForEach(model.provider=="openai" ? ["gpt-4.1-mini","gpt-4.1"]:["claude-haiku-4-5","claude-sonnet-4-5"],id:\.self){Text($0).tag($0)}}
  Text("Keys are encrypted in Supabase Vault, accessed only by the authenticated backend, and never returned to the app.").font(.caption).foregroundStyle(.secondary)
  Button("Delete saved provider key",role:.destructive){Task{await model.deleteKey()}}.disabled(model.status?.providers.contains(model.provider) != true)
 }
 }.padding(30)}}
 var plan:some View{ScrollView{VStack(alignment:.leading,spacing:20){Text(model.status?.pro==true ? "You’re on Pro.":"Start small. Ask away.").font(.title.bold());Text(model.status?.pro==true ? "No daily Thread quota. Provider fees and short-term abuse limits still apply.":"\(model.status?.used ?? 0) of 20 requests used today. Resets at midnight UTC.").foregroundStyle(.secondary)
  if model.status?.pro != true{Text("A$10 / month").font(.title2.bold());Button("Upgrade with Stripe"){Task{await model.billing("checkout")}}.buttonStyle(.borderedProminent).tint(.primary)}
  Button("Manage paid subscription"){Task{await model.billing("portal")}}
  Divider();Text("Have a private access code?").font(.headline);SecureField("Premium code",text:$ui.code).textFieldStyle(.roundedBorder);Button("Redeem code"){let value=code;code="";Task{await model.redeem(value)}}.disabled(code.isEmpty)
  Button("Refresh plan"){Task{await model.refresh()}}
 }.padding(30)}}
 var preferences:some View{ScrollView{VStack(alignment:.leading,spacing:22){Text("Your pet, your pace.").font(.title2.bold());Toggle("Follow my active window",isOn:$model.follow);Toggle("Read answers aloud",isOn:$model.voiceReplies);Text("The pet stays visible across desktops. Drag it anywhere to pause following. Click the pet or press ⌥⌘Space to open your conversation.").foregroundStyle(.secondary).fixedSize(horizontal:false,vertical:true)
  Divider();Label(DesktopTools.trusted ? "Accessibility enabled":"Accessibility permission needed for window actions",systemImage:"hand.raised");Button("Set up Accessibility permission"){DesktopTools.requestPermission()};Text("Screen Recording is requested only when you choose Read screen text. Microphone and Speech Recognition are requested only when you start dictation. Thread does not record continuously.").font(.caption).foregroundStyle(.secondary)
  Divider();Text("Beta 0.6.0").font(.headline);Text("This developer beta is ad-hoc signed, not notarized by Apple. Account sessions stay in memory until the app quits. Email sign-in is supported.").font(.caption).foregroundStyle(.secondary).fixedSize(horizontal:false,vertical:true);Link("Support & privacy",destination:BuddyModel.site.appendingPathComponent("support"))
 }.padding(30)}}
}
