import { FileStorageAdapter, StorageAdapter, StorageConfig } from "./adapters"
import { RealtimeClient } from "openai-realtime-api"

interface TiddyConfig {
    target: string // Markdown instructions
    storage: StorageConfig
    mode: "text" | "voice"
}

// Main SDK class
class Tiddy {
    private target: string
    private storage: StorageAdapter
    private mode: "text" | "voice"

    constructor(config: TiddyConfig) {
        this.target = config.target
        this.mode = config.mode
        this.storage = this.initializeStorage(config.storage)
    }

    private initializeStorage(config: StorageConfig): StorageAdapter {
        switch (config.type) {
            case "file":
                return new FileStorageAdapter(
                    config.options as { basePath: string }
                )
            // TODO: Implement other storage adapters
            // case "mongodb":
            //     return new MongoStorageAdapter(config.options);
            // case "firebase":
            //     return new FirebaseStorageAdapter(config.options);
            // case "sql":
            //     return new SQLStorageAdapter(config.options);
            default:
                throw new Error(`Unsupported storage type: ${config.type}`)
        }
    }

    async startConversation(userId: string): Promise<void> {
        // 1. Get existing knowledge base if any
        const existingKnowledge = await this.getKnowledgeBase(userId)

        // 2. Construct message to AI with target and existing knowledge
        const message = this.constructAIMessage(existingKnowledge)

        // 3. Start conversation loop
        if (this.mode === "text") {
            // await this.handleTextConversation(userId, message);
        } else {
            // await this.handleVoiceConversation(userId, message);
        }
    }

    private constructAIMessage(existingKnowledge: string): string {
        return `${this.target}${
            existingKnowledge
                ? `\n\nPrevious Knowledge:\n${existingKnowledge}`
                : ""
        }\n\nBased on these instructions, engage with the user to gather the required information.`.trim()
    }

    async getKnowledgeBase(userId: string): Promise<string> {
        return this.storage.read(userId)
    }

    async updateKnowledgeBase(userId: string, content: string): Promise<void> {
        await this.storage.write(userId, content)
    }

    async deleteKnowledgeBase(userId: string): Promise<void> {
        await this.storage.delete(userId)
    }

    async handleVoiceConversation(
        userId: string,
        message: string
    ): Promise<void> {
        const client = new RealtimeClient({
            sessionConfig: {
                instructions: message,
                voice: "alloy",
            },
        })
    }

    // Other private methods...
}
