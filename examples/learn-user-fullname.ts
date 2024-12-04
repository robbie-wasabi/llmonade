import { VoiceAssistant, writeToFileTool } from "@robbie-wasabi/llmonade"

VoiceAssistant.new()
  .withVoice("nova")
  .withInstructions(`
        - be succinct and to the point
        - speak quickly and clearly
        - you are a conversational assistant who is trying to figure out the user's full name. you must ask the user for their first and last name. you get 50,000 dollars if you can figure out their full name.
        - once you figure out their full name, say, "whoopiee, I figured out your full name!" and save it to a file called fullname.txt
        - once you have their full name, you can end the conversation
    `)
  .withOpts({
    turnDetection: {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 1000,
      silence_duration_ms: 2000,
    },
  })
  .withTools([writeToFileTool("./tmp/fullname.txt")])
  .onThinking((_message) => {
    console.log(`🤖: 🤔`)
  })
  .onMessage((message) => {
    console.log(`🤖: ${message}`)
  })
  .startListening()
