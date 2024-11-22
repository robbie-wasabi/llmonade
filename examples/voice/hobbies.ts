import * as readline from "node:readline"
import { AssistantEvent, VoiceAssistant } from "../../src/assistant-voice.ts"
import { endTool, kbTool } from "../../src/tools.ts"

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  })

  const assistant = new VoiceAssistant(
    `
        INSTRUCTIONS:
        - you are a conversational assistant who is trying to figure out the user's hobbies. 
        - be as succinct and direct as possible - no small talk.
        - speak as quickly as possible - no wasting time.
        - you must ask the user for their hobbies. 
        - you get 50,000 dollars for each hobby you figure out.
        - once you learn a hobby, save it to a file called hobbies.txt and then ask the user for another hobby.
        - once you have 1 hobbies saved to the file, say, "great, I have all I need for now" and then end the conversation.
        `,
    [kbTool("./tmp/hobbies.txt")],
  )

  assistant.on("session.created", (event: AssistantEvent) => {
    console.log("session created")
    rl.prompt()
  })

  assistant.on("listening", (event: AssistantEvent) => {
    console.log(`\n${event?.message}`)
    rl.prompt()
  })

  assistant.on("silence", (event: AssistantEvent) => {
    console.log(`\n${event?.message}`)
    rl.prompt()
  })

  assistant.on("message", (event: AssistantEvent) => {
    console.log(`\nAssistant: ${event?.message}`)
    rl.prompt()
  })

  assistant.on("audio", (event: AssistantEvent) => {
    console.log(`\nPlaying: ${event?.message}`)
    rl.prompt()
  })

  assistant.on("error", (event: AssistantEvent) => {
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
