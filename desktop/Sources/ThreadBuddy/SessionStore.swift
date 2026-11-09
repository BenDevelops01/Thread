import Foundation
import CryptoKit
// Native session only. Provider API keys remain in Supabase Vault.
// This avoids Keychain; a user-account compromise can still access the device key.
enum SessionStore {
 static var testDirectory:URL?
 static var directory:URL{testDirectory ?? FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("Thread/Buddy",isDirectory:true)}
 static var sessionURL:URL{directory.appendingPathComponent("session.enc")}
 static var keyURL:URL{directory.appendingPathComponent("device.key")}
 static func prepare() throws {
  try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true,attributes:[.posixPermissions:0o700])
  try FileManager.default.setAttributes([.posixPermissions:0o700],ofItemAtPath:directory.path)
  var folder=directory;var values=URLResourceValues();values.isExcludedFromBackup=true;try? folder.setResourceValues(values)
 }
 static func key(create:Bool) throws -> SymmetricKey {
  if FileManager.default.fileExists(atPath:keyURL.path){let bytes=try Data(contentsOf:keyURL);guard bytes.count==32 else{throw APIError(message:"Saved device sign-in is unavailable. Sign in again.")};return SymmetricKey(data:bytes)}
  guard create else{throw APIError(message:"No saved sign-in.")}
  try prepare();let key=SymmetricKey(size:.bits256);let bytes=key.withUnsafeBytes{Data($0)}
  guard FileManager.default.createFile(atPath:keyURL.path,contents:bytes,attributes:[.posixPermissions:0o600]) else{throw APIError(message:"Unable to save this Mac’s sign-in.")};return key
 }
 static func save(_ session:Session) throws {
  try prepare();let sealed=try AES.GCM.seal(JSONEncoder().encode(session),using:key(create:true));guard let data=sealed.combined else{throw APIError(message:"Unable to save sign-in.")}
  try data.write(to:sessionURL,options:.atomic);try FileManager.default.setAttributes([.posixPermissions:0o600],ofItemAtPath:sessionURL.path)
 }
 static func load() -> Session? {
  guard FileManager.default.fileExists(atPath:sessionURL.path) else{return nil}
  do{let sealed=try AES.GCM.SealedBox(combined:Data(contentsOf:sessionURL));let bytes=try AES.GCM.open(sealed,using:key(create:false));return try JSONDecoder().decode(Session.self,from:bytes)}catch{try? clear();return nil}
 }
 static func clear() throws {for url in [sessionURL,keyURL] where FileManager.default.fileExists(atPath:url.path){try FileManager.default.removeItem(at:url)}}
}
