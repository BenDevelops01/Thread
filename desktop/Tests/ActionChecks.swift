import Foundation
@main struct ActionChecks {
 static func main() throws {
  for j in [#"{"type":"shell","text":"whoami"}"#,#"{"type":"open_url","url":"file:///etc/passwd"}"#,#"{"type":"open_url","url":"https://user:password@example.com"}"#,#"{"type":"move_window","layout":"destroy"}"#,#"{"type":"type_text","text":""}"#]{
   let action=try JSONDecoder().decode(DesktopAction.self,from:Data(j.utf8));var rejected=false;do{_ = try action.validated()}catch{rejected=true};precondition(rejected,"Unsafe operation accepted")
  }
  for j in [#"{"type":"open_url","url":"https://example.com/help"}"#,#"{"type":"move_window","layout":"left"}"#,#"{"type":"type_text","text":"A draft to review"}"#]{_ = try JSONDecoder().decode(DesktopAction.self,from:Data(j.utf8)).validated()}
  print("PASS: shell, file URLs, credential URLs, invalid layouts and empty insertion rejected; supported actions accepted.")
 }
}
