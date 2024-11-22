// deno-lint-ignore-file
import { FunctionDefinition } from "openai/resources/index.js"
import { Assistant } from "./assistant.ts"
import { readFile, writeFile } from "node:fs/promises"

export type ToolHandler = (
  data: Record<string, any>,
  onSuccess?: (data: string[]) => void,
) => Promise<any>

export const endTool = (
  assistant: Assistant,
): {
  definition: FunctionDefinition
  handler: ToolHandler
} => ({
  definition: {
    name: "endTool",
    description: "End the conversation",
  },
  handler: async () => {
    await assistant.end()
  },
})

export const kbTool = (
  filePath: string,
): {
  definition: FunctionDefinition
  handler: ToolHandler
} => ({
  definition: {
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
