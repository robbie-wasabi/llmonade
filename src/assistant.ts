import "dotenv/config"
import { EventEmitter } from "events"
import { endTool } from "./tools.js"

export interface Tool {
    definition: any
    handler: (...args: any[]) => Promise<any>
}

export interface AssistantEvent {
    type: "message" | "error" | "thinking" | "audio" | "silence" | "listening"
    content?: string
    audioData?: Int16Array
    role?: "assistant" | "user"
}

export abstract class Assistant extends EventEmitter {
    protected tools: Tool[]
    protected instructions: string
    protected isProcessing: boolean = false

    constructor(
        instructions: string,
        tools: Tool[] = [],
        canEnd: boolean = true
    ) {
        super()
        this.instructions = instructions
        this.tools = tools
        if (canEnd) {
            this.tools.push(endTool(this))
        }
    }

    abstract start(greeting?: string): Promise<void>

    isReady(): boolean {
        return !this.isProcessing
    }

    abstract end(): Promise<void>
}
