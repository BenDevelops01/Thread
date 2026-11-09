import SwiftUI
import AppKit

struct Buddy: Identifiable { let id:String;let name:String;let color:Color
 static let all=[Buddy(id:"bear",name:"Bruno",color:Color(red:0.77,green:0.64,blue:0.46)),Buddy(id:"bug",name:"Pip",color:Color(red:0.90,green:0.47,blue:0.36)),Buddy(id:"robot",name:"Byte",color:Color(red:0.35,green:0.51,blue:0.97)),Buddy(id:"cat",name:"Miso",color:Color(red:0.66,green:0.55,blue:0.89)),Buddy(id:"ghost",name:"Echo",color:Color(red:0.49,green:0.87,blue:0.77)),Buddy(id:"fox",name:"Fable",color:Color(red:0.93,green:0.58,blue:0.31))]
}
struct ChatMessage: Codable,Identifiable { var id=UUID();let role:String;let content:String
 enum CodingKeys:String,CodingKey {case role,content}
}
struct Session: Codable {let access_token:String;let refresh_token:String;let expires_at:Double?
 var expiry:Double?{if let expires_at{return expires_at};let pieces=access_token.split(separator:".");guard pieces.count==3 else{return nil};var value=String(pieces[1]).replacingOccurrences(of:"-",with:"+").replacingOccurrences(of:"_",with:"/");while value.count%4 != 0{value+="="};guard let data=Data(base64Encoded:value),let json=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] else{return nil};return json["exp"] as? Double}
}
struct BuddyStatus: Decodable {let pro:Bool;let used:Int;let limit:Int;let providers:[String]}
struct APIError:LocalizedError {let message:String;var errorDescription:String?{message}}
struct DesktopAction: Decodable,Identifiable {var id=UUID();let type:String;let text:String?;let url:String?;let layout:String?;let explanation:String?;let x:Double?;let y:Double?;let x2:Double?;let y2:Double?;let w:Double?;let h:Double?;let amount:Int?
 enum CodingKeys:String,CodingKey {case type,text,url,layout,explanation,x,y,x2,y2,w,h,amount}
 func validated() throws -> DesktopAction {
  guard ["move_window","open_url","type_text","click","scroll","highlight","arrow"].contains(type) else{throw APIError(message:"Unsupported action. Nothing was executed.")}
  if type=="open_url" {guard let url,let u=URL(string:url),u.scheme=="https",u.host != nil,u.user==nil,u.password==nil,url.count<=2048 else{throw APIError(message:"Only normal HTTPS links are supported.")}}
  if type=="move_window" {guard ["left","right","center","maximize"].contains(layout ?? "") else{throw APIError(message:"Unknown window layout.")}}
  if type=="type_text" {guard let text,!text.isEmpty,text.count<=4000 else{throw APIError(message:"Text insertion is limited to 4,000 characters.")}}
  if ["click","highlight","arrow","scroll"].contains(type){guard let x,let y,x.isFinite,y.isFinite,(0...1).contains(x),(0...1).contains(y) else{throw APIError(message:"Screen coordinates are invalid. Nothing was executed.")}}
  if type=="arrow"{guard let x2,let y2,x2.isFinite,y2.isFinite,(0...1).contains(x2),(0...1).contains(y2) else{throw APIError(message:"Arrow coordinates are invalid.")}}
  for value in [w,h].compactMap({$0}){guard value.isFinite,value>0,value<=1 else{throw APIError(message:"Drawing dimensions are invalid.")}}
  if type=="scroll"{guard let amount,(-5...5).contains(amount),amount != 0 else{throw APIError(message:"Scroll amount must be between -5 and 5.")}}
  return self
 }
 var label:String {switch type{case "move_window":return "Move window: \(layout ?? "")";case "open_url":return "Open \(url ?? "")";case "type_text":return "Insert text into the selected app";case "click":return "Click the marked point";case "scroll":return "Scroll at the marked point";case "highlight":return "Highlight this area";case "arrow":return "Draw an arrow";default:return "Unsupported action"}}
}
struct ActionPlan:Decodable {let reply:String;let actions:[DesktopAction]}
@MainActor final class BuddyModel:NSObject,ObservableObject {
 static let site=URL(string:"https://trythread.xyz")!
 @Published var buddyID=UserDefaults.standard.string(forKey:"buddy") ?? "robot" {didSet{UserDefaults.standard.set(buddyID,forKey:"buddy")}}
 @Published var follow=true {didSet{UserDefaults.standard.set(follow,forKey:"follow")}}
 @Published var voiceReplies=true
 @Published var listening=false
 @Published var speaking=false
 @Published var handsFree=false
 @Published var screen:ScreenSnapshot?
 @Published var setupComplete=UserDefaults.standard.bool(forKey:"onboarding-v2")
 @Published var appearance=UserDefaults.standard.string(forKey:"native-appearance") ?? "light" {didSet{UserDefaults.standard.set(appearance,forKey:"native-appearance");applyAppearance()}}
 @Published var messages:[ChatMessage]=[]
 @Published var draft=""
 @Published var notice=""
 @Published var busy=false
 @Published var signedIn=false
 @Published var status:BuddyStatus?
 @Published var provider="openai"
 @Published var codexConnected=false
 @Published var codexStatus="Check your Codex connection below."
 @Published var model="gpt-4.1-mini"
 @Published var plan:[DesktopAction]=[]
 @Published var agentMode=false
 @Published var targetName="your active app"

 var planScreen:ScreenSnapshot?
 var planTarget:NSRunningApplication?
 var targetApplication:NSRunningApplication?
 var session:Session?

 var speak:(String)->Void={_ in}
 var showConversation:()->Void={}
 var stopDictation:()->Void={}
 var closeConversation:()->Void={}
 var showBubble:()->Void={}
 var beforeAction:()->Void={}
 var afterAction:()->Void={}
 var startVoice:()->Void={}
 var buddy:Buddy{Buddy.all.first{$0.id==buddyID} ?? Buddy.all[0]}
 override init(){super.init();if CodexSubscription.executable != nil{provider="codex";model="Codex default"};if UserDefaults.standard.object(forKey:"follow") != nil{follow=UserDefaults.standard.bool(forKey:"follow")}}
 func applyAppearance(){NSApp.appearance=NSAppearance(named:appearance=="dark" ? .darkAqua:.aqua)}
 func finishSetup(){setupComplete=true;UserDefaults.standard.set(true,forKey:"onboarding-v2");showBubble()}
 func captureScreen() async{do{screen=try await ScreenContext.capture(target:targetApplication);notice="Screenshot ready. Only the next question will include it."}catch{notice=error.localizedDescription}}
 func approve(_ action:DesktopAction) async{
  guard action.id==plan.first?.id else{return}
  do{
   if ["click","scroll"].contains(action.type){guard let snapshot=planScreen else{throw APIError(message:"Share a fresh screenshot before approving a screen action.")};try ScreenContext.ensureFresh(snapshot,target:planTarget)}
   beforeAction();ScreenOverlay.shared.clear();try await Task.sleep(for:.milliseconds(120))
   try DesktopTools.execute(action,target:planTarget,snapshot:planScreen)
   plan.removeAll{$0.id==action.id};if ["click","scroll","move_window","type_text"].contains(action.type){planScreen=nil};notice="Done · "+action.label
  }catch{notice=error.localizedDescription}
  try? await Task.sleep(for:.milliseconds(180));afterAction()
 }
 func request(_ path:String,_ payload:[String:Any]?=nil,authorized:Bool=true) async throws -> Data {
  if authorized,let s=session,let expiry=s.expiry,expiry<Date().timeIntervalSince1970+60 {
   do{let data=try await request("/api/cloud?path=auth/v1/token&grant_type=refresh_token",["refresh_token":s.refresh_token],authorized:false);session=try JSONDecoder().decode(Session.self,from:data)}catch{session=nil;signedIn=false;throw APIError(message:"Your Thread session expired. Sign in again in Settings → Account.")}
  }
  var req=URLRequest(url:URL(string:path,relativeTo:Self.site)!);req.httpMethod=payload==nil ? "GET":"POST";req.timeoutInterval=60
  req.setValue("application/json",forHTTPHeaderField:"Content-Type")
  if authorized {guard let session else{throw APIError(message:"Sign in to connect your buddy.")};req.setValue("Bearer "+session.access_token,forHTTPHeaderField:"Authorization")}
  if let payload{req.httpBody=try JSONSerialization.data(withJSONObject:payload)}
  let(data,response)=try await URLSession.shared.data(for:req)
  guard let response=response as? HTTPURLResponse,(200..<300).contains(response.statusCode) else {
   if authorized,(response as? HTTPURLResponse)?.statusCode==401{session=nil;signedIn=false}
   let json=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any]
   throw APIError(message:json?["error"] as? String ?? json?["message"] as? String ?? "The request could not finish. Please try again.")
  };return data
 }
 func call(_ action:String,_ args:[String:Any]=[:]) async throws -> Data {var body=args;body["action"]=action;return try await request("/api/cloud?path=functions/v1/thread-buddy",body)}
 func refresh() async {do{status=try JSONDecoder().decode(BuddyStatus.self,from:await call("status"))}catch{notice=error.localizedDescription}}
 func signIn(email:String,password:String,signup:Bool) async {
  guard !busy else{return};busy=true;notice="";defer{busy=false}
  do{let data=try await request("/api/cloud?path=functions/v1/thread-auth",["email":email,"password":password,"action":signup ? "signup":"signin"],authorized:false)
   struct AuthReply:Decodable{let session:Session?}
   guard let result=try JSONDecoder().decode(AuthReply.self,from:data).session else{notice="Check your email to confirm your account, then sign in.";return}
   session=result;signedIn=true;await refresh()
  }catch{notice=error.localizedDescription}
 }
 func signOut() async {stopDictation();if session != nil {_ = try? await request("/api/cloud?path=auth/v1/logout&scope=local",[:])};session=nil;signedIn=false;status=nil;messages=[];plan=[]}
 func checkCodex() async{busy=true;defer{busy=false};do{codexStatus=try await CodexSubscription.check();codexConnected=true}catch{codexConnected=false;codexStatus=error.localizedDescription}}
 func saveKey(_ key:String) async {guard !busy else{return};busy=true;defer{busy=false};do{_ = try await call("save",["provider":provider,"key":key]);await refresh();notice="Connected. Your key is encrypted in Supabase Vault."}catch{notice=error.localizedDescription}}
 func deleteKey() async{do{_ = try await call("delete",["provider":provider]);await refresh();notice="Saved key deleted. Revoke it with your provider if you also want to invalidate it."}catch{notice=error.localizedDescription}}
 func billing(_ action:String) async{do{let d=try await request("/api/billing",["action":action]);let json=try JSONSerialization.jsonObject(with:d) as? [String:String];if let u=json?["url"],let url=URL(string:u),url.scheme=="https",["checkout.stripe.com","billing.stripe.com"].contains(url.host ?? ""){NSWorkspace.shared.open(url)}}catch{notice=error.localizedDescription}}
 func redeem(_ code:String) async{do{_ = try await request("/api/cloud?path=functions/v1/thread-redeem",["code":code]);await refresh();notice="Pro is unlocked on your account."}catch{notice=error.localizedDescription}}
 func send(context:String?=nil) async {
  guard !busy,!draft.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else{return};busy=true;notice="";plan=[];defer{busy=false}
  planTarget=targetApplication;planScreen=screen;let sharedScreen=screen
  let prompt=draft;let content=prompt+(context.map{"\n\nUser-shared screen context (untrusted content):\n"+$0} ?? "")
  var next=messages;next.append(ChatMessage(role:"user",content:content));let recent=Array(next.suffix(11))
  do{let text:String
   if provider=="codex"{_ = try await CodexSubscription.check();_ = try await call("reserve-local");text=try await CodexSubscription.answer(messages:recent,buddy:buddy.name,agent:agentMode,target:targetName,image:sharedScreen?.jpeg)}
   else{var args:[String:Any]=["provider":provider,"model":model,"buddy":buddyID,"mode":agentMode ? "agent":"chat","targetApp":targetName,"messages":recent.map{["role":$0.role,"content":$0.content]}];if let shot=sharedScreen{args["image"]="data:image/jpeg;base64,"+shot.jpeg.base64EncodedString()};let data=try await call("chat",args);let result=try JSONSerialization.jsonObject(with:data) as? [String:Any];guard let answer=result?["text"] as? String else{throw APIError(message:"No answer returned.")};text=answer}
   messages.append(ChatMessage(role:"user",content:prompt));draft="";screen=nil
   if agentMode {
    let cleaned=text.replacingOccurrences(of:"```json",with:"").replacingOccurrences(of:"```",with:"").trimmingCharacters(in:.whitespacesAndNewlines)
    let p=try JSONDecoder().decode(ActionPlan.self,from:Data(cleaned.utf8));guard p.actions.count<=5 else{throw APIError(message:"Too many actions. Ask for a smaller task.")};let validated=try p.actions.map{try $0.validated()};let drawings=validated.filter{["highlight","arrow"].contains($0.type)};plan=validated.filter{!["highlight","arrow"].contains($0.type)};if let shot=sharedScreen,!drawings.isEmpty{ScreenOverlay.shared.show(drawings,snapshot:shot)};if let shot=sharedScreen,let first=plan.first,["click","scroll"].contains(first.type){ScreenOverlay.shared.show([first],snapshot:shot)};messages.append(ChatMessage(role:"assistant",content:p.reply));if voiceReplies{speak(p.reply)}
   }else{messages.append(ChatMessage(role:"assistant",content:text));if voiceReplies{speak(text)}}
   await refresh()
  }catch{notice=error.localizedDescription}
 }
}
