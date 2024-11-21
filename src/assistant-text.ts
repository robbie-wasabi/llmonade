import OpenAI from "openai"
import { Assistant, Tool } from "./assistant.js"

export class TextAssistant extends Assistant {
    private client: OpenAI
    private messages: OpenAI.Chat.ChatCompletionMessageParam[]
    private model = "gpt-4o"

    constructor(instructions: string, tools: Tool[] = []) {
        super(instructions, tools)
        this.client = new OpenAI()
        this.messages = [
            {
                role: "system",
                content: instructions,
            },
        ]
    }

    async start(greeting?: string) {
        console.log("Conversation started")
        if (greeting) {
            this.messages.push({
                role: "assistant",
                content: greeting,
            })
        }
    }

    async sendMessage(text: string) {
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
                        (t) =>
                            t.definition.function.name ===
                            toolCall.function.name
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
                    }
                )

                responseMessage.content =
                    finalResponse.choices[0].message.content
            }

            this.messages.push(responseMessage)
            console.log(`Assistant: ${responseMessage.content}`)

            this.isProcessing = false
            this.emit("message", {
                type: "message",
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

    getMessages() {
        return this.messages
    }

    async end() {
        // TODO
        console.log("Conversation ended")
    }
}
