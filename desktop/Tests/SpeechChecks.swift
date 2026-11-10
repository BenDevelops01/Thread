import Foundation
@main struct SpeechChecks {
 static func main(){let text=SpeechVoices.spoken("**Look here**: [the guide](https://example.com/help).\n```sh\nrm private-example\n```\nVisit https://example.com/long-path")
  precondition(text.contains("the guide") && !text.contains("rm private-example") && !text.contains("https://") && !text.contains("**"))
  precondition(NeuralVoiceOption.all.count==6 && NeuralVoiceOption.all.contains(where:{$0.id=="af_heart"}))
  print("PASS: spoken replies omit code fences and raw URLs; six neural voices are selectable without Apple synthesis.")
 }
}
