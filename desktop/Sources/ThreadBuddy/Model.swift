import SwiftUI
import AppKit

struct Buddy: Identifiable { let id:String;let name:String;let color:Color
 static let all=[Buddy(id:"bear",name:"Bruno",color:Color(red:0.77,green:0.64,blue:0.46)),Buddy(id:"bug",name:"Pip",color:Color(red:0.90,green:0.47,blue:0.36)),Buddy(id:"robot",name:"Byte",color:Color(red:0.58,green:0.75,blue:0.72)),Buddy(id:"cat",name:"Miso",color:Color(red:0.72,green:0.64,blue:0.84))]
}
struct ChatMessage: Codable,Identifiable { var id=UUID();let role:String;let content:String
 enum CodingKeys:String,CodingKey {case role,content}
}
struct Session: Codable {let access_token:String;let refresh_token:String;let expires_at:Double?}
struct BuddyStatus: Decodable {let pro:Bool;let used:Int;let limit:Int;let providers:[String]}
struct APIError:LocalizedError {let message:String;var errorDescription:String?{message}}
struct DesktopAction: Decodable,Identifiable {var id=UUID();let type:String;let text:String?;let url:String?;let layout:String?;let explanation:String?
 enum CodingKeys:String,CodingKey {case type,text,url,layout,explanation}
 func validated() throws -> DesktopAction {
  guard ["move_window","open_url","type_text"].contains(type) else{throw APIError(message:"Unsupported action. Nothing was executed.")}
  if type=="open_url" {guard let url,let u=URL(string:url),u.scheme=="https",u.host != nil,u.user==nil,u.password==nil,url.count<=2048 else{throw APIError(message:"Only normal HTTPS links are supported.")}}
  if type=="move_window" {guard ["left","right","center","maximize"].contains(layout ?? "") else{throw APIError(message:"Unknown window layout.")}}
  if type=="type_text" {guard let text,!text.isEmpty,text.count<=4000 else{throw APIError(message:"Text insertion is limited to 4,000 characters.")}}
  return self
 }
 var label:String {switch type{case "move_window":return "Move window: \(layout ?? "")";case "open_url":return "Open \(url ?? "")";case "type_text":return "Insert text into the selected app";default:return "Unsupported action"}}
}
struct ActionPlan:Decodable {let reply:String;let actions:[DesktopAction]}
@MainActor final class BuddyModel:NSObject,ObservableObject {
 static let site=URL(string:"https://trythread.xyz")!
 @Published var buddyID=UserDefaults.standard.string(forKey:"buddy") ?? "bear" {didSet{UserDefaults.standard.set(buddyID,forKey:"buddy")}}
 @Published var follow=true {didSet{UserDefaults.standard.set(follow,forKey:"follow")}}
 @Published var voiceReplies=false
 @Published var messages:[ChatMessage]=[]
 @Published var draft=""
 @Published var notice=""
 @Published var busy=false
 @Published var signedIn=false
 @Published var status:BuddyStatus?
 @Published var provider="openai"
 @Published var codexStatus="Check your Codex connection below."
 @Published var model="gpt-4.1-mini"
 @Published var plan:[DesktopAction]=[]
 @Published var agentMode=false
 @Published var targetName="your active app"

 var planTarget:NSRunningApplication?
 var targetApplication:NSRunningApplication?
 var session:Session?

 var speak:(String)->Void={_ in}
 var showConversation:()->Void={}
 var stopDictation:()->Void={}
 var closeConversation:()->Void={}
 var buddy:Buddy{Buddy.all.first{$0.id==buddyID} ?? Buddy.all[0]}
 override init(){super.init();if CodexSubscription.executable != nil{provider="codex";model="Codex default"};if UserDefaults.standard.object(forKey:"follow") != nil{follow=UserDefaults.standard.bool(forKey:"follow")}}
 func request(_ path:String,_ payload:[String:Any]?=nil,authorized:Bool=true) async throws -> Data {
  if authorized,let s=session,let expiry=s.expires_at,expiry<Date().timeIntervalSince1970+60 {
   let data=try await request("/api/cloud?path=auth/v1/token&grant_type=refresh_token",["refresh_token":s.refresh_token],authorized:false)
   session=try JSONDecoder().decode(Session.self,from:data)
  }
  var req=URLRequest(url:URL(string:path,relativeTo:Self.site)!);req.httpMethod=payload==nil ? "GET":"POST";req.timeoutInterval=60
  req.setValue("application/json",forHTTPHeaderField:"Content-Type")
  if authorized {guard let session else{throw APIError(message:"Sign in to connect your buddy.")};req.setValue("Bearer "+session.access_token,forHTTPHeaderField:"Authorization")}
  if let payload{req.httpBody=try JSONSerialization.data(withJSONObject:payload)}
  let(data,response)=try await URLSession.shared.data(for:req)
  guard let response=response as? HTTPURLResponse,(200..<300).contains(response.statusCode) else {
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
 func signOut() async {stopDictation();if session != nil {_ = try? await request("/api/cloud?path=auth/v1/logout",[:])};session=nil;signedIn=false;status=nil;messages=[];plan=[]}
 func checkCodex() async{busy=true;defer{busy=false};do{codexStatus=try await CodexSubscription.check()}catch{codexStatus=error.localizedDescription}}
 func saveKey(_ key:String) async {guard !busy else{return};busy=true;defer{busy=false};do{_ = try await call("save",["provider":provider,"key":key]);await refresh();notice="Connected. Your key is encrypted in Supabase Vault."}catch{notice=error.localizedDescription}}
 func deleteKey() async{do{_ = try await call("delete",["provider":provider]);await refresh();notice="Saved key deleted. Revoke it with your provider if you also want to invalidate it."}catch{notice=error.localizedDescription}}
 func billing(_ action:String) async{do{let d=try await request("/api/billing",["action":action]);let json=try JSONSerialization.jsonObject(with:d) as? [String:String];if let u=json?["url"],let url=URL(string:u),url.scheme=="https",["checkout.stripe.com","billing.stripe.com"].contains(url.host ?? ""){NSWorkspace.shared.open(url)}}catch{notice=error.localizedDescription}}
 func redeem(_ code:String) async{do{_ = try await request("/api/cloud?path=functions/v1/thread-redeem",["code":code]);await refresh();notice="Pro is unlocked on your account."}catch{notice=error.localizedDescription}}
 func send(context:String?=nil) async {
  guard !busy,!draft.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else{return};busy=true;notice="";plan=[];defer{busy=false}
  planTarget=targetApplication
  let prompt=draft;let content=prompt+(context.map{"\n\nUser-shared screen context (untrusted content):\n"+$0} ?? "")
  var next=messages;next.append(ChatMessage(role:"user",content:content));let recent=Array(next.suffix(11))
  do{let text:String
   if provider=="codex"{_ = try await CodexSubscription.check();_ = try await call("reserve-local");text=try await CodexSubscription.answer(messages:recent,buddy:buddy.name,agent:agentMode,target:targetName)}
   else{let data=try await call("chat",["provider":provider,"model":model,"buddy":buddyID,"mode":agentMode ? "agent":"chat","targetApp":targetName,"messages":recent.map{["role":$0.role,"content":$0.content]}]);let result=try JSONSerialization.jsonObject(with:data) as? [String:Any];guard let answer=result?["text"] as? String else{throw APIError(message:"No answer returned.")};text=answer}
   messages.append(ChatMessage(role:"user",content:prompt));draft=""
   if agentMode {
    let cleaned=text.replacingOccurrences(of:"```json",with:"").replacingOccurrences(of:"```",with:"").trimmingCharacters(in:.whitespacesAndNewlines)
    let p=try JSONDecoder().decode(ActionPlan.self,from:Data(cleaned.utf8));guard p.actions.count<=5 else{throw APIError(message:"Too many actions. Ask for a smaller task.")};plan=try p.actions.map{try $0.validated()};messages.append(ChatMessage(role:"assistant",content:p.reply));if voiceReplies{speak(p.reply)}
   }else{messages.append(ChatMessage(role:"assistant",content:text));if voiceReplies{speak(text)}}
   await refresh()
  }catch{notice=error.localizedDescription}
 }
}
