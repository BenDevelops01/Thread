import Foundation
@main struct SessionCheck {
 @MainActor static func main() async throws {
  let env=ProcessInfo.processInfo.environment;let a=BuddyModel(persistSession:false),b=BuddyModel(persistSession:false);guard let email=env["THREAD_TEST_EMAIL"],let password=env["THREAD_TEST_PASSWORD"] else{throw APIError(message:"Missing fixture")}
  await a.signIn(email:email,password:password,signup:false);await b.signIn(email:email,password:password,signup:false)
  guard a.signedIn,b.signedIn,let s=b.session else{throw APIError(message:"Sign-in failed")}
  b.session=Session(access_token:s.access_token,refresh_token:s.refresh_token,expires_at:1);b.notice="";await b.refresh();guard b.notice.isEmpty,b.status != nil,(b.session?.expiry ?? 0)>Date().timeIntervalSince1970 else{throw APIError(message:"Refresh failed: "+b.notice)}
  await a.signOut();b.notice="";await b.refresh();guard b.notice.isEmpty,b.signedIn else{throw APIError(message:"Another session was logged out")};await b.signOut()
  print("PASS: native expired-session refresh; local sign-out preserves second account session.")
 }
}
