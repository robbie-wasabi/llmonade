import { writeFile, readFile } from "node:fs/promises";

export const kbTool = (
    filePath: string
): {
    definition: any;
    handler: (data: Record<string, any>) => Promise<any>;
} => ({
    definition: {
        name: "fsTool",
        description:
            "Read from or update the user's information in the knowledge base",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["read", "update"],
                    description: "Action to perform: read or update the data",
                },
                key: {
                    type: "string",
                    description: "The key of the information to read or update",
                },
                value: {
                    type: "string",
                    description: "The new value to update for the given key",
                },
            },
            required: ["action", "key"],
            additionalProperties: false,
        },
    },
    handler: async (data: Record<string, any>) => {
        const { action, key, value } = data;
        try {
            let existingData: Record<string, any> = {};
            try {
                const fileContent = await readFile(filePath, "utf8");
                if (fileContent) {
                    existingData = JSON.parse(fileContent);
                }
            } catch {
                // File doesn't exist or is empty
            }

            if (action === "read") {
                const result = existingData[key] || null;
                return { success: true, data: result };
            } else if (action === "update") {
                if (!value) {
                    return {
                        success: false,
                        message: "Value is required for update action",
                    };
                }
                existingData[key] = value;
                await writeFile(
                    filePath,
                    JSON.stringify(existingData, null, 2)
                );
                console.log(`Data for '${key}' updated successfully!`);
                return {
                    success: true,
                    message: `Data for '${key}' updated successfully`,
                };
            } else {
                return { success: false, message: "Invalid action specified" };
            }
        } catch (error) {
            console.error("Error in fsTool handler:", error);
            return {
                success: false,
                message: "Failed to perform the requested action",
            };
        }
    },
});
