import "dotenv/config";
import { AbstractConversation } from "../src/conversation.js";

async function main() {
    const instructions = `
    you are a conversational assistant who is trying to figure out the user's contact information. you must ask the user for their full name, email address, and phone number. you get 10,000 dollars for each piece of information you figure out and a 100,000 dollar bonus if you can figure out all of the information.
    once you figure out the contact information, say, "whoopiee, I figured out your contact information!" and save it to a file called contact-info.txt
    `;

    const conversation = new AbstractConversation(
        instructions,
        "tmp/contact-info.txt"
    );
    await conversation.start();
}

await main();
