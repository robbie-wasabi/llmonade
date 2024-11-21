import "dotenv/config";
import { Readable } from "node:stream";
import microphone from "mic";
import { RealtimeClient } from "openai-realtime-api";
import Speaker from "speaker";
import { kbTool } from "./tools.js";

interface Tool {
    definition: any; // ToolDefinition
    handler: (...args: any[]) => Promise<any>;
}

export class AbstractConversation {
    private client: RealtimeClient;
    private tools: Tool[];
    private instructions: string;
    private saveFilePath: string;
    private speaker?: Speaker;

    constructor(
        instructions: string,
        saveFilePath: string,
        voice: string = "shimmer"
    ) {
        this.instructions = instructions;
        this.saveFilePath = saveFilePath;
        this.tools = [kbTool(this.saveFilePath)];
        this.client = new RealtimeClient({
            debug: false,
            sessionConfig: {
                voice,
                instructions: this.instructions,
                turn_detection: null,
            },
        });
    }

    async start() {
        this.tools.forEach((tool) =>
            this.client.addTool(tool.definition, tool.handler)
        );

        await this.client.connect();
        await this.client.waitForSessionCreated();

        this.startAudioStream();

        this.client.on("conversation.item.completed", ({ item }) => {
            const { formatted: _, ...rest } = item;
            console.log("Conversation item completed:", rest);

            if (
                item.type === "message" &&
                item.role === "assistant" &&
                item.formatted &&
                item.formatted.audio
            ) {
                console.log(
                    `Playing audio response... "${item.formatted.transcript}"`
                );
                this.playAudio(item.formatted.audio);
            }
        });
    }

    private mic?: microphone.Mic;
    private startAudioStream() {
        try {
            this.mic = microphone({
                rate: "24000",
                channels: "1",
                debug: false,
                exitOnSilence: 6,
                fileType: "raw",
                encoding: "signed-integer",
            });

            const micInputStream = this.mic.getAudioStream();

            micInputStream.on("error", (error: any) => {
                console.error("Microphone error:", error);
            });

            this.mic.start();
            console.log("Microphone started streaming.");

            let audioBuffer = Buffer.alloc(0);
            const chunkSize = 4800; // 0.2 seconds of audio at 24kHz

            micInputStream.on("data", (data: Buffer) => {
                audioBuffer = Buffer.concat([audioBuffer, data]);

                while (audioBuffer.length >= chunkSize) {
                    const chunk = audioBuffer.subarray(0, chunkSize);
                    audioBuffer = audioBuffer.subarray(chunkSize);

                    const int16Array = new Int16Array(
                        chunk.buffer,
                        chunk.byteOffset,
                        chunk.length / 2
                    );

                    try {
                        this.client.appendInputAudio(int16Array);
                    } catch (err) {
                        console.error("Error sending audio data:", err);
                    }
                }
            });

            micInputStream.on("silence", () => {
                console.log("Silence detected, creating response...");
                try {
                    this.client.createResponse();
                } catch (err) {
                    console.error("Error creating response:", err);
                }
            });
        } catch (err) {
            console.error("Error starting audio stream:", err);
        }
    }

    private playAudio(audioData: Int16Array) {
        try {
            if (!this.speaker) {
                this.speaker = new Speaker({
                    channels: 1,
                    bitDepth: 16,
                    sampleRate: this.client.conversation.frequency,
                });
            }

            const buffer = Buffer.from(audioData.buffer);
            const readableStream = new Readable({
                read() {
                    this.push(buffer);
                    this.push(null);
                },
            });

            this.speaker.on("finish", () => {
                this.speaker?.end();
                this.speaker = undefined;
            });

            this.speaker.on("error", (err) => {
                console.error("Speaker error:", err);
                this.speaker = undefined;
            });

            readableStream.pipe(this.speaker);
            console.log(
                "Audio sent to speaker for playback. Buffer length:",
                buffer.length
            );
        } catch (err) {
            console.error("Error playing audio:", err);
            this.speaker = undefined;
        }
    }
}
