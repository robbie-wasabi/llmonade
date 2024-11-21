import "dotenv/config"
import * as readline from "node:readline"
import { TextAssistant } from "../../src/assistant-text.js"
import { kbTool } from "../../src/tools.js"

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

async function main() {
    const assistant = new TextAssistant(
        `
        INSTRUCTIONS:
        - be succinct and to the point
        - you are a conversational assistant who is trying to figure out the user's birthday. you must ask the user for their birthday. you get 50,000 dollars if you can figure out the birthday.
        - once you figure out the birthday, say, "whoopiee, I figured out your birthday!" and save it to a file called birthday.txt
        `,
        [kbTool("./conversation.json")]
    )

    assistant.on("thinking", () => {
        process.stdout.write("🤔 ")
    })

    assistant.on("message", (event) => {
        console.log(`\n🤖 ${event.content}\n`)
    })

    assistant.on("error", (event) => {
        console.error(`\n❌ ${event.content}\n`)
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
