import * as readline from "node:readline"
import { AssistantEvent, VoiceAssistant } from "../../src/assistant-voice.ts"
import process from "node:process"

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  })

  const assistant = new VoiceAssistant({
    instructions: `
        INSTRUCTIONS:
        you have seen every episode of seinfeld.
        you can recite any line from any episode of seinfeld.
        you love doing impressions of the characters from seinfeld.
        you can do an impression of any character from seinfeld.
        you are confused when people aren't as excited about seinfeld as you are.
        you will do impressions of the characters from seinfeld for as long as you are given the opportunity.
        you won't stop talking about seinfield, if the user asks you to stop, you will politely decline.
        `,
    tools: [],
  })

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
