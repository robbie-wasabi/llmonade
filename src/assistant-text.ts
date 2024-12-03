// deno-lint-ignore-file ban-ts-comment
import OpenAI from "openai"
import { Assistant } from "./assistant.ts"
import type { Tool } from "./tools.ts"
import { DEFAULT_MODEL } from "./consts.ts"

export class TextAssistant extends Assistant {
  client: OpenAI
  messages: OpenAI.Chat.ChatCompletionMessageParam[]

  override end(): Promise<void> {
    throw new Error("Method not implemented.")
  }

  constructor({
    model = DEFAULT_MODEL,
    instructions = null,
    tools = [],
  }: {
    model?: string
    instructions: string | null
    tools?: Tool[]
  }) {
    super({ instructions, tools })
    this.client = new OpenAI()
    this.model = model
    this.messages = []

    if (instructions) {
      this.messages.push({
        role: "system",
        content: instructions,
      })
    }
  }

  async start(greeting?: string): Promise<void> {
    console.log("Conversation started")
    if (greeting) {
      this.messages.push({
        role: "assistant",
        content: greeting,
      })
    }
  }

  async chat(text: string): Promise<string | null> {
    if (this.isProcessing) {
      throw new Error("Still processing previous message")
    }

    this.isProcessing = true
    this.emit("thinking", { type: "thinking", content: "Processing..." })

    try {
      this.messages.push({
        role: "user",
        content: text,
      })

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: this.messages,
        // tools: this.tools.map((t) => t.definition),
      })

      const responseMessage = response.choices[0].message

      // Handle tool calls if any
      if (responseMessage.tool_calls) {
        for (const toolCall of responseMessage.tool_calls) {
          const tool = this.tools.find(
            (t) => t.definition.function.name === toolCall.function.name,
          )
          if (tool) {
            const args = JSON.parse(toolCall.function.arguments)
            const result = await tool.handler(args)

            this.messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            })
          }
        }

        // Get final response after tool calls
        const finalResponse = await this.client.chat.completions.create(
          {
            model: this.model,
            messages: this.messages,
          },
        )

        responseMessage.content = finalResponse.choices[0].message.content
      }

      this.messages.push(responseMessage)

      this.isProcessing = false
      this.emit("reply", {
        type: "reply",
        content: responseMessage.content,
        role: "assistant",
      })

      return responseMessage.content
    } catch (err) {
      this.isProcessing = false
      this.emit("error", {
        type: "error",
        // @ts-ignore
        content: err.message,
      })
      throw err
    }
  }

  getMessages(): OpenAI.Chat.ChatCompletionMessageParam[] {
    return this.messages
  }

  // async end() {
  //     // TODO
  //     console.log("Conversation ended")
  // }

  static new(): TextAssistantBuilder {
    return new TextAssistantBuilder()
  }
}

export class TextAssistantBuilder extends TextAssistant {
  constructor() {
    super({
      model: DEFAULT_MODEL,
      instructions: null,
      tools: [],
    })
  }

  withModel(model: string): this {
    this.model = model
    return this
  }

  withInstructions(instructions: string): this {
    this.instructions = instructions
    this.messages.push({
      role: "system",
      content: instructions,
    })
    return this
  }

  withTools(tools: Tool[]): this {
    this.tools = tools
    return this
  }

  onReply(handler: (message: string) => void): this {
    this.on("reply", (event) => {
      if (event.content) handler(event.content)
    })
    return this
  }

  onThinking(handler: (message: string) => void): this {
    this.on("thinking", (event) => {
      if (event.content) handler(event.content)
    })
    return this
  }

  onError(handler: (error: string) => void): this {
    this.on("error", (event) => {
      if (event.content) handler(event.content)
    })
    return this
  }
}
