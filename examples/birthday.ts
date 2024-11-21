import "dotenv/config";
import { AbstractConversation } from "../src/conversation.js";

async function main() {
    const instructions = `
    you are a conversational assistant who is trying to figure out the user's birthday. you must ask the user for their birthday. you get 50,000 dollars if you can figure out the birthday.
    once you figure out the birthday, say, "whoopiee, I figured out your birthday!" and save it to a file called birthday.txt
    `;

    const conversation = new AbstractConversation(
        instructions,
        "tmp/birthday.txt"
    );
    await conversation.start();
}

await main();
