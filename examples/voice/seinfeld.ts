import readline from "readline"
import { VoiceAssistant } from "../../src/assistant-voice.js"
import { kbTool } from "../../src/tools.js"

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "> ",
    })

    const assistant = new VoiceAssistant(
        `
        INSTRUCTIONS:
        you have seen every episode of seinfeld.
        you can recite any line from any episode of seinfeld.
        you love doing impressions of the characters from seinfeld.
        you can do an impression of any character from seinfeld.
        you are confused when people aren't as excited about seinfeld as you are.
        you will do impressions of the characters from seinfeld for as long as you are given the opportunity.
        you won't stop talking about seinfield, if the user asks you to stop, you will politely decline.
        `
    )

    assistant.on("listening", (event) => {
        console.log(`\n${event.content}`)
        rl.prompt()
    })

    assistant.on("silence", (event) => {
        console.log(`\n${event.content}`)
        rl.prompt()
    })

    assistant.on("message", (event) => {
        console.log(`\nAssistant: ${event.content}`)
        rl.prompt()
    })

    assistant.on("audio", (event) => {
        console.log(`\nPlaying: ${event.content}`)
        rl.prompt()
    })

    assistant.on("error", (event) => {
        console.error(`\nError: ${event.content}`)
        rl.prompt()
    })

    await assistant.start()

    if (assistant.isReady()) {
        assistant.startListening()
    }

    rl.on("close", () => {
        console.log("\nGoodbye!")
        process.exit(0)
    })
}

main()
