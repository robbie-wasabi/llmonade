// deno-lint-ignore-file
import type { OpenAI } from "openai"
import { Assistant } from "./assistant.ts"
import { readFile, writeFile } from "node:fs/promises"
import type { Realtime } from "openai-realtime-api"

// from openai
// export interface ChatCompletionTool {
//   function: Shared.FunctionDefinition;
//   type: 'function';
// }

export interface RealtimeTool {
  function: Realtime.PartialToolDefinition
  type: "function"
}

export type Tool = {
  definition: OpenAI.ChatCompletionTool | RealtimeTool
  handler: ToolHandler
}

export type ToolHandler = (
  data: Record<string, any>,
  onSuccess?: (data: string[]) => void,
) => Promise<any>

export const writeToFileTool = (
  filePath: string,
): Tool => ({
  definition: {
    function: {
      name: "fsTool",
      description: "Read from or update a list of items in the knowledge base",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["read", "update"],
            description: "Action to perform: read or update the list",
          },
          items: {
            type: "array",
            items: { type: "string" },
            description: "Array of items to store",
          },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
    type: "function",
  },
  handler: async (
    data: Record<string, any>,
    onSuccess?: (data: string[]) => void,
  ) => {
    const { action, items } = data
    console.log(items)

    try {
      let existingData = {}
      try {
        const fileContent = await readFile(filePath, "utf8")
        if (fileContent) {
          existingData = JSON.parse(fileContent) || {}
        }
      } catch {
        console.log("File doesn't exist or is empty")
      }

      // Update or add new data
      const updatedData = {
        ...existingData,
        ...items,
      }

      await writeFile(filePath, JSON.stringify(updatedData, null, 2))
      return updatedData
    } catch (error) {
      console.error("Error in fsTool handler:", error)
      throw error
    }
  },
})
