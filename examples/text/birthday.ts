import { TextAssistant, writeToFileTool } from "@robbie-wasabi/llmonade"
import * as readline from "node:readline"
import process from "node:process"

// builder pattern with writing to files

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const assistant = TextAssistant.new()
  .withModel("gpt-4o-mini")
  .withInstructions(`
        INSTRUCTIONS:
        - be succinct and to the point
        - you are a conversational assistant who is trying to figure out the user's birthday. you must ask the user for their birthday. you get 50,000 dollars if you can figure out the birthday.
        - once you figure out the birthday, say, "whoopiee, I figured out your birthday!" and save it to a file called birthday.txt
        `)
  .withTools([writeToFileTool("./tmp/birthday.txt")])
  .onThinking((_message) => {
    console.log(`🤖: 🤔`)
  })
  .onMessage((message) => {
    console.log(`🤖: ${message}`)
  })
  .onError((message) => {
    console.log(`🤖: error: ${message}`)
  })

const askQuestion = () => {
  rl.question("You: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      rl.close()
      return
    }
    await assistant.sendMessage(input)
    askQuestion()
  })
}

askQuestion()
