import * as readline from "node:readline"
import { TextAssistant } from "../../src/assistant-text.ts"
import process from "node:process"

// basic builder pattern

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const assistant = TextAssistant.new()
  .withModel("gpt-4o")
  .withInstructions("you are a helpful assistant")
  .onThinking((_message) => {
    console.log(`🤖: 🤔`)
  })
  .onMessage((message) => {
    console.log(`🤖: ${message}`)
  })

const askQuestion = () => {
  rl.question("You: ", async (input) => {
    try {
      await assistant.sendMessage(input)
    } catch (err) {
      console.error(err)
    }
    askQuestion()
  })
}

askQuestion()
