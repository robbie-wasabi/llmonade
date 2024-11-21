import "dotenv/config"
import { VoiceAssistant } from "../../src/assistant-voice.js"
import { kbTool } from "../../src/tools.js"

async function main() {
    const assistant = new VoiceAssistant(
        `
        you are a conversational assistant who is trying to figure out the user's contact information.
        you must ask the user for their full name, email address, and phone number.
        you get 10,000 dollars for each piece of information you figure out and a 100,000 dollar bonus if you can figure out all of the information.
        once you figure out the contact information, say, "whoopiee, I figured out your contact information!" and save it to a file called contact-info.txt
    `,
        [kbTool("./tmp/contact-info.text")]
    )
    assistant.start().then(() => assistant.startListening())
}

await main()
