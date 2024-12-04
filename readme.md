# LLMonade 🍋

https://github.com/robbie-wasabi/llmonade

A simple yet powerful SDK for building conversational AI assistants using
OpenAI. Supports both text and voice interactions.

## Features

- Builder pattern for easy configuration
- Text and Voice assistant support
- Extensible tools system
- Real-time voice interactions
- Event-driven architecture
- File storage capabilities
- Easily integrate with Discord, telegram, etc... (less than 40 lines of code
  total - [see example](examples/discord-chatbot.ts))

## Installation

```bash
deno add @robbie-wasabi/llmonade
```

Or via JSR:

```bash
jsr add @robbie-wasabi/llmonade
```

## Quick Start

### Text Assistant

```typescript
import { TextAssistant } from "@robbie-wasabi/llmonade"

const assistant = TextAssistant.new()
  .withModel("gpt-4o")
  .withInstructions("You are a helpful assistant")
  .onThinking(() => console.log("🤔"))
  .onReply((message) => console.log(`🤖: ${message}`))

const reply = await assistant.chat("Hello!")
```

### Voice Assistant

```typescript
import { VoiceAssistant } from "@robbie-wasabi/llmonade"

VoiceAssistant.new()
  .withVoice("nova")
  .withInstructions("You are a helpful assistant")
  .withOpts({
    turnDetection: {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 1000,
      silence_duration_ms: 2000,
    },
  })
  .onThinking(() => console.log("🤔"))
  .onMessage((message) => console.log(`🤖: ${message}`))
  .startListening()
```

## Tools System

LLMonade supports custom tools that allow assistants to perform actions. Here's
an example using the built-in file writing tool:

```typescript
import { TextAssistant, writeToFileTool } from "@robbie-wasabi/llmonade"

const assistant = TextAssistant.new()
  .withInstructions("Save important information to a file")
  .withTools([writeToFileTool("./data.txt")])
```

## Examples

### Discord Bot

```typescript
import { TextAssistant } from "@robbie-wasabi/llmonade"
import { Client } from "discord.js"

const client = new Client({
  intents: ["GUILDS", "DIRECT_MESSAGES", "GUILD_MESSAGES"],
})

const assistant = TextAssistant.new()
  .withModel("gpt-4")
  .withInstructions("You are a helpful Discord bot")

client.on("messageCreate", async (msg) => {
  if (msg.content.includes("!llmonade")) {
    const reply = await assistant.chat(msg.content)
    msg.channel.send(reply)
  }
})

client.connect()
```

## API Reference

### TextAssistant

- `new()`: Creates a new builder instance
- `withModel(model: string)`: Sets the OpenAI model
- `withInstructions(instructions: string)`: Sets system instructions
- `withTools(tools: Tool[])`: Adds tools
- `onThinking(handler: (message: string) => void)`: Thinking event handler
- `onReply(handler: (message: string) => void)`: Reply event handler
- `onError(handler: (error: string) => void)`: Error event handler

### VoiceAssistant

- `new()`: Creates a new builder instance
- `withVoice(voice: string)`: Sets the voice model
- `withInstructions(instructions: string)`: Sets system instructions
- `withTools(tools: Tool[])`: Adds tools
- `withOpts(opts: AssistantOpts)`: Sets additional options
- `onMessage(handler: (message: string) => void)`: Message event handler
- `onThinking(handler: (message: string) => void)`: Thinking event handler
- `onError(handler: (error: string) => void)`: Error event handler
- `startListening()`: Starts the voice assistant

## License

MIT © Robert Rossilli
