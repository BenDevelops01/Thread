import Foundation
@main struct ActionChecks {
 static func main() throws {
  for j in [#"{"type":"click","x":-0.1,"y":0.5}"#,#"{"type":"scroll","x":0.5,"y":0.5,"amount":6}"#,#"{"type":"arrow","x":0.1,"y":0.2,"x2":2,"y2":0.3}"#,#"{"type":"highlight","x":0.5,"y":0.5,"w":-1}"#,#"{"type":"shell","text":"whoami"}"#,#"{"type":"open_url","url":"file:///etc/passwd"}"#,#"{"type":"open_url","url":"https://user:password@example.com"}"#,#"{"type":"move_window","layout":"destroy"}"#,#"{"type":"type_text","text":""}"#]{
   let action=try JSONDecoder().decode(DesktopAction.self,from:Data(j.utf8));var rejected=false;do{_ = try action.validated()}catch{rejected=true};precondition(rejected,"Unsafe operation accepted")
  }
  for j in [#"{"type":"click","x":0.5,"y":0.5}"#,#"{"type":"scroll","x":0.5,"y":0.5,"amount":-2}"#,#"{"type":"highlight","x":0.5,"y":0.5,"w":0.1,"h":0.1}"#,#"{"type":"arrow","x":0.1,"y":0.2,"x2":0.3,"y2":0.4}"#,#"{"type":"open_url","url":"https://example.com/help"}"#,#"{"type":"move_window","layout":"left"}"#,#"{"type":"type_text","text":"A draft to review"}"#]{_ = try JSONDecoder().decode(DesktopAction.self,from:Data(j.utf8)).validated()}
  let payload=Data(#"{"exp":1800000000}"#.utf8).base64EncodedString().replacingOccurrences(of:"=",with:"")
  let session=try JSONDecoder().decode(Session.self,from:JSONSerialization.data(withJSONObject:["access_token":"header."+payload+".signature","refresh_token":"test"]))
  precondition(session.expiry==1800000000,"Legacy session expiry must be recovered for token refresh")
  let old=ScreenSnapshot(jpeg:Data(),width:100,height:100,bounds:CGRect(x:0,y:0,width:100,height:100),targetPID:nil,windowBounds:nil,capturedAt:Date().addingTimeInterval(-46))
  precondition(!old.isRecent,"Stale screenshot must be rejected")
  precondition(old.point(x:1,y:1)==CGPoint(x:99,y:99),"Coordinates must stay within display pixels")
  print("PASS: shell, file URLs, credential URLs, invalid layouts and empty insertion rejected; supported actions accepted; invalid screen coordinates, drawing dimensions and scroll amounts rejected.")
 }
}
