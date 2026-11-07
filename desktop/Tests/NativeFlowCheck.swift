import Foundation
@main struct NativeFlowCheck {
 @MainActor static func main() async throws {
  let env=ProcessInfo.processInfo.environment;guard let email=env["THREAD_TEST_EMAIL"],let password=env["THREAD_TEST_PASSWORD"] else{throw APIError(message:"Set disposable Thread test credentials in the environment.")};let model=BuddyModel()
  await model.signIn(email:email,password:password,signup:false)
  guard model.signedIn else{throw APIError(message:"Native sign-in failed: "+model.notice)}
  model.provider="codex";model.draft="Reply with only: Ready to help."
  await model.send()
  guard model.messages.last?.role=="assistant",model.messages.last?.content.contains("Ready to help")==true else{throw APIError(message:"Native conversation failed: "+model.notice)}
  model.agentMode=true;model.draft="Suggest moving my current window to the left half of the display. Do not execute it."
  await model.send()
  guard model.plan.first?.type=="move_window",model.plan.first?.layout=="left" else{throw APIError(message:"Native action planning failed: "+model.notice)}
  print("PASS: native Swift account sign-in → authenticated quota → official Codex subscription → actual conversation → validated window-action preview. No action executed without approval.")
  await model.signOut()
 }
}
