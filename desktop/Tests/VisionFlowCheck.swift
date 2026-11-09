import AppKit
@main struct VisionCheck {
 @MainActor static func main() async throws {
  let image=NSImage(size:NSSize(width:800,height:500));image.lockFocus();NSColor.white.setFill();NSBezierPath(rect:NSRect(x:0,y:0,width:800,height:500)).fill();("SCREEN TEST 742" as NSString).draw(at:NSPoint(x:60,y:380),withAttributes:[.font:NSFont.systemFont(ofSize:36),.foregroundColor:NSColor.black]);NSColor.systemBlue.setFill();NSBezierPath(roundedRect:NSRect(x:280,y:160,width:240,height:80),xRadius:10,yRadius:10).fill();("Preview" as NSString).draw(at:NSPoint(x:350,y:184),withAttributes:[.font:NSFont.systemFont(ofSize:24),.foregroundColor:NSColor.white]);image.unlockFocus()
  guard let tiff=image.tiffRepresentation,let rep=NSBitmapImageRep(data:tiff),let jpeg=rep.representation(using:.jpeg,properties:[:]) else{throw APIError(message:"Fixture failed")}
  let text=try await CodexSubscription.answer(messages:[ChatMessage(role:"user",content:"Read the exact heading in this image. Then draw a highlight around the blue Preview button. Do not click anything.")],buddy:"Byte",agent:true,target:"Synthetic test fixture",image:jpeg)
  let cleaned=text.replacingOccurrences(of:"```json",with:"").replacingOccurrences(of:"```",with:"").trimmingCharacters(in:.whitespacesAndNewlines)
  let plan=try JSONDecoder().decode(ActionPlan.self,from:Data(cleaned.utf8));guard plan.reply.contains("742"),plan.actions.contains(where:{$0.type=="highlight"}) else{throw APIError(message:"Image or annotation response failed: "+text)}
  for action in plan.actions{_ = try action.validated()}
  print("PASS: official signed-in Codex subscription read synthetic screenshot heading 742 and generated validated normalized highlight coordinates. No desktop action executed.")
 }
}
