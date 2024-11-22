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
      let existingItems: string[] = []
      try {
        const fileContent = await readFile(filePath, "utf8")
        if (fileContent) {
          existingItems = JSON.parse(fileContent)
        }
      } catch {
        // File doesn't exist or is empty
        console.log("File doesn't exist or is empty")
      }

      if (action === "read") {
        const formattedItems = existingItems.map((item) => `- ${item}`)
        return { success: true, data: formattedItems }
      }

      if (action === "update") {
        if (!items || !Array.isArray(items)) {
          return {
            success: false,
            message: "Items array is required for update action",
          }
        }

        // Clean items and only add new ones
        const cleanItems = items.map((item) =>
          item.startsWith("- ") ? item.slice(2) : item
        )

        const updatedItems = [...existingItems]
        for (const item of cleanItems) {
          if (!updatedItems.includes(item)) {
            updatedItems.push(item)
          }
        }

        await writeFile(
          filePath,
          JSON.stringify(updatedItems, null, 2),
        )

        onSuccess?.(updatedItems)
        return {
          success: true,
          message: "List updated successfully",
          data: updatedItems.map((item) => `- ${item}`),
        }
      }

      return { success: false, message: "Invalid action specified" }
    } catch (error) {
      console.error("Error in fsTool handler:", error)
      return {
        success: false,
        message: "Failed to perform the requested action",
      }
    }
  },
})
