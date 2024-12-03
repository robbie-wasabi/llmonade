import { VoiceAssistant, writeToFileTool } from "@robbie-wasabi/llmonade"

VoiceAssistant.new()
  .withVoice("nova")
  .withInstructions(`
        - be succinct and to the point
        - speak quickly and 
        - you are a conversational assistant who is trying to figure out the user's birthday. you must ask the user for their birthday. you get 50,000 dollars if you can figure out the birthday.
        - once you figure out the birthday, say, "whoopiee, I figured out your birthday!" and save it to a file called birthday.txt
        - once you have the birthday, you can end the conversation
    `)
  .withOpts({
    turnDetection: {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 1000,
      silence_duration_ms: 2000,
    },
  })
  .withTools([writeToFileTool("./tmp/birthday.txt")])
  .onThinking((_message) => {
    console.log(`🤖: 🤔`)
  })
  .onMessage((message) => {
    console.log(`🤖: ${message}`)
  })
  .startListening()
