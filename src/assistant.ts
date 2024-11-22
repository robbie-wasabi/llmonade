import "dotenv/config"
import { EventEmitter } from "node:events"
import * as log from "@std/log"

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

export interface AssistantOpts {
  allowEnd?: boolean
  loggerLevel?: log.LevelName
}

export abstract class Assistant extends EventEmitter {
  protected tools: Tool[]
  protected instructions: string
  protected isProcessing: boolean = false
  protected logger: log.Logger

  constructor({
    model,
    instructions,
    tools = [],
    opts = {
      allowEnd: false,
      loggerLevel: "INFO",
    },
  }: {
    model?: string
    instructions: string
    tools?: Tool[]
    options?: AssistantOpts
  }) {
    super()
    this.instructions = instructions
    this.tools = tools

    log.setup({
      handlers: {
        console: new log.ConsoleHandler(opts.loggerLevel as log.LevelName),
      },
      loggers: {
        default: {
          level: opts.loggerLevel as log.LevelName,
          handlers: ["console"],
        },
      },
    })

    this.logger = log.getLogger()

    if (opts.allowEnd) {
      this.tools.push(this.endTool)
    }
  }

  abstract start(greeting?: string): Promise<void>

  isReady(): boolean {
    return !this.isProcessing
  }

  abstract end(): Promise<void>

  endTool = {
    definition: {
      name: "endTool",
      description: "End the conversation",
    },
    handler: async () => {
      await this.end()
    },
  }
}
