import * as readline from "node:readline"
import { VoiceAssistant } from "../../src/assistant-voice.ts"
import { kbTool } from "../../src/tools.ts"

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  })

  const assistant = new VoiceAssistant(
    `
        INSTRUCTIONS:
        - be succinct and to the point
        - speak quickly and 
        - you are a conversational assistant who is trying to figure out the user's birthday. you must ask the user for their birthday. you get 50,000 dollars if you can figure out the birthday.
        - once you figure out the birthday, say, "whoopiee, I figured out your birthday!" and save it to a file called birthday.txt
        - once you have the birthday, you can end the conversation
        `,
    [kbTool("./tmp/birthday.txt")],
  )

  assistant.on("listening", (event) => {
    console.log(`\n${event?.message}`)
    rl.prompt()
  })

  assistant.on("silence", (event) => {
    console.log(`\n${event?.message}`)
    rl.prompt()
  })

  assistant.on("message", (event) => {
    console.log(`\nAssistant: ${event?.message}`)
    rl.prompt()
  })

  assistant.on("audio", (event) => {
    console.log(`\nPlaying: ${event?.message}`)
    rl.prompt()
  })

  assistant.on("error", (event) => {
    console.error(`\nError: ${event?.message}`)
    rl.prompt()
  })

  await assistant.start()

  if (assistant.isReady()) {
    assistant.listen()
  }

  rl.on("close", () => {
    console.log("\nGoodbye!")
    process.exit(0)
  })
}

main()
