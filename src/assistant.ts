import { EventEmitter } from "node:events"
import * as log from "@std/log"
import { DEFAULT_MODEL } from "./consts.ts"
import type { Tool } from "./tools.ts"

// export interface Tool {
//   definition: {
//     name: string
//     description: string
//     parameters: { [key: string]: any }
//   }
//   handler: (...args: unknown[]) => Promise<unknown>
// }

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
  protected isProcessing = false
  protected logger: log.Logger
  protected model: string

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
    opts?: AssistantOpts
  }) {
    super()
    this.instructions = instructions
    this.tools = tools
    this.model = model ?? DEFAULT_MODEL

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

  endTool: Tool = {
    definition: {
      type: "function",
      function: {
        name: "endTool",
        description: "End the conversation",
        parameters: {},
      },
    },
    handler: async (): Promise<void> => {
      await this.end()
    },
  }
}
