import { Client, Message } from "https://deno.land/x/harmony/mod.ts"
import { TextAssistant } from "@robbie-wasabi/llmonade"

const client = new Client({
  intents: [
    "GUILDS",
    "DIRECT_MESSAGES",
    "GUILD_MESSAGES",
  ],
  token: Deno.env.get("DISCORD_TOKEN"),
})

const assistant = TextAssistant.new()
  .withModel("gpt-4o")
  .withInstructions(
    "You are a helpful assistant that can answer questions and help with tasks.",
  )
  .onThinking(() => {
    console.log("thinking...")
  })
  .onError((error) => {
    console.error(error)
  })

client.on("ready", () => {
  console.log(`Ready! User: ${client.user?.tag}`)
})

client.on("messageCreate", async (msg: Message): Promise<void> => {
  if (msg.content.toLowerCase().includes("!llmonade")) {
    const reply = await assistant.chat(msg.content)
    if (!reply) {
      console.error("No reply from assistant")
      return
    }
    msg.channel.send(reply)
  }
})

client.connect()
