import "dotenv/config"
import * as readline from "node:readline"
import { TextAssistant } from "../../src/assistant-text.ts"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function main() {
  const assistant = new TextAssistant(
    `
        you play rock paper scissors with the user.
        the user will select first.
        exit when the game is over.
        `,
  )

  assistant.on("thinking", () => {
    process.stdout.write("🤔 ")
  })

  assistant.on("message", (event) => {
    console.log(`\n🤖 ${event.message}\n`)
  })

  assistant.on("error", (event) => {
    console.error(`\n❌ ${event.message}\n`)
  })

  await assistant.start()

  const askQuestion = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close()
        return
      }

      try {
        await assistant.sendMessage(input)
      } catch (err) {
        console.error("Failed to get response")
      }
      askQuestion()
    })
  }

  askQuestion()
}

main()
