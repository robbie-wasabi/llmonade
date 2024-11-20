// Core interfaces
export interface StorageConfig {
    type: "file" | "mongodb" | "firebase" | "sql";
    options: {
        [key: string]: any; // Specific config for each storage type
    };
}

// Storage adapter interface
export interface StorageAdapter {
    read(userId: string): Promise<string>;
    write(userId: string, content: string): Promise<void>;
    delete(userId: string): Promise<void>;
}

// Example storage adapter implementation
export class FileStorageAdapter implements StorageAdapter {
    private basePath: string;

    constructor(options: { basePath: string }) {
        this.basePath = options.basePath;
    }

    async read(userId: string): Promise<string> {
        // Implementation...
        return "";
    }

    async write(userId: string, content: string): Promise<void> {
        // Implementation...
    }

    async delete(userId: string): Promise<void> {
        // Implementation...
    }
}
