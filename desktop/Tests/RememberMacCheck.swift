import Foundation
@main struct RememberMacCheck {
 @MainActor static func main() async throws {
  let folder=FileManager.default.temporaryDirectory.appendingPathComponent("thread-remember-test-"+UUID().uuidString);SessionStore.testDirectory=folder;defer{try? FileManager.default.removeItem(at:folder);SessionStore.testDirectory=nil}
  let env=ProcessInfo.processInfo.environment;guard let email=env["THREAD_TEST_EMAIL"],let password=env["THREAD_TEST_PASSWORD"] else{throw APIError(message:"Missing disposable fixture")}
  let first=BuddyModel();await first.signIn(email:email,password:password,signup:false);guard first.signedIn,let s=first.session else{throw APIError(message:"Fixture sign-in failed")}
  let bytes=try Data(contentsOf:SessionStore.sessionURL);precondition(!String(decoding:bytes,as:UTF8.self).contains(s.access_token),"Session must not be stored as plaintext")
  let attributes=try FileManager.default.attributesOfItem(atPath:SessionStore.keyURL.path);precondition((attributes[.posixPermissions] as? NSNumber)?.intValue==0o600)
  let relaunched=BuddyModel();guard relaunched.signedIn,relaunched.session?.access_token==s.access_token else{throw APIError(message:"Relaunch did not restore session")}
  relaunched.session=Session(access_token:s.access_token,refresh_token:s.refresh_token,expires_at:1);await relaunched.refresh();guard relaunched.signedIn,relaunched.notice.isEmpty,(relaunched.session?.expiry ?? 0)>Date().timeIntervalSince1970 else{throw APIError(message:"Remembered refresh failed")}
  let again=BuddyModel();guard again.signedIn,(again.session?.expiry ?? 0)>Date().timeIntervalSince1970 else{throw APIError(message:"Refreshed session was not saved")}
  await relaunched.signOut();let signedOut=BuddyModel();precondition(!signedOut.signedIn && !FileManager.default.fileExists(atPath:SessionStore.keyURL.path))
  print("PASS: encrypted session → restored native model → real token refresh → persisted renewed session → sign-out removes session/device key. Isolated fixture directory only.")
 }
}
