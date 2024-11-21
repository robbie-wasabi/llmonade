import { Readable } from "node:stream"
import microphone from "mic"
import { RealtimeClient } from "openai-realtime-api"
import Speaker from "speaker"
import { Assistant, Tool } from "./assistant.js"

export class VoiceAssistant extends Assistant {
    private client: RealtimeClient
    private speaker?: Speaker
    private isListening: boolean = false
    private mic?: microphone.Mic

    constructor(
        instructions: string,
        tools: Tool[] = [],
        voice: string = "shimmer"
    ) {
        super(instructions, tools)
        this.client = new RealtimeClient({
            debug: false,
            sessionConfig: {
                voice,
                instructions: this.instructions,
                turn_detection: null,
            },
        })
    }

    async start(greeting?: string) {
        console.log("Conversation started")

        // doesn't work yet
        // if (greeting) {
        //     this.client.appendInputText(greeting);
        // }

        this.tools.forEach((tool) =>
            this.client.addTool(tool.definition, tool.handler)
        )

        await this.client.connect()
        await this.client.waitForSessionCreated()

        this.client.on("conversation.item.completed", ({ item }) => {
            const { formatted: _, ...rest } = item
            this.emit("message", {
                type: "message",
                content: rest,
                role: "assistant",
            })

            if (
                item.type === "message" &&
                item.role === "assistant" &&
                item.formatted &&
                item.formatted.audio
            ) {
                this.emit("audio", {
                    type: "audio",
                    content: item.formatted.transcript,
                    audioData: item.formatted.audio,
                })
                this.playAudio(item.formatted.audio)
            }
        })
    }

    startListening() {
        if (this.isListening) return
        this.isListening = true
        this.startAudioStream()
        this.emit("listening", { type: "listening", content: "Listening..." })
    }

    stopListening() {
        if (!this.isListening) return
        this.isListening = false
        this.mic?.stop()
        this.emit("listening", {
            type: "listening",
            content: "Stopped listening",
        })
    }

    private startAudioStream() {
        try {
            this.mic = microphone({
                rate: "24000",
                channels: "1",
                debug: false,
                exitOnSilence: 6,
                fileType: "raw",
                encoding: "signed-integer",
            })

            const micInputStream = this.mic.getAudioStream()

            micInputStream.on("error", (error: any) => {
                console.error("Microphone error:", error)
            })

            this.mic.start()
            console.log("Microphone started streaming.")

            let audioBuffer = Buffer.alloc(0)
            const chunkSize = 4800 // 0.2 seconds of audio at 24kHz

            micInputStream.on("data", (data: Buffer) => {
                audioBuffer = Buffer.concat([audioBuffer, data])

                while (audioBuffer.length >= chunkSize) {
                    const chunk = audioBuffer.subarray(0, chunkSize)
                    audioBuffer = audioBuffer.subarray(chunkSize)

                    const int16Array = new Int16Array(
                        chunk.buffer,
                        chunk.byteOffset,
                        chunk.length / 2
                    )

                    try {
                        this.client.appendInputAudio(int16Array)
                    } catch (err) {
                        console.error("Error sending audio data:", err)
                    }
                }
                this.emit("listening", {
                    type: "listening",
                    content: "Processing audio...",
                })
            })

            micInputStream.on("silence", () => {
                this.emit("silence", {
                    type: "silence",
                    content: "Silence detected",
                })
                this.isProcessing = true
                try {
                    this.client.createResponse()
                } catch (err) {
                    this.emit("error", {
                        type: "error",
                        content: "Error creating response",
                    })
                }
            })
        } catch (err) {
            this.emit("error", {
                type: "error",
                content: "Error starting audio stream",
            })
        }
    }

    private playAudio(audioData: Int16Array) {
        try {
            if (!this.speaker) {
                this.speaker = new Speaker({
                    channels: 1,
                    bitDepth: 16,
                    sampleRate: this.client.conversation.frequency,
                })
            }

            const buffer = Buffer.from(audioData.buffer)
            const readableStream = new Readable({
                read() {
                    this.push(buffer)
                    this.push(null)
                },
            })

            this.speaker.on("finish", () => {
                this.speaker?.end()
                this.speaker = undefined
            })

            this.speaker.on("error", (err) => {
                console.error("Speaker error:", err)
                this.speaker = undefined
            })

            readableStream.pipe(this.speaker)
            console.log(
                "Audio sent to speaker for playback. Buffer length:",
                buffer.length
            )
            this.emit("audio", {
                type: "audio",
                content: "Playing audio response",
                audioData,
            })
        } catch (err) {
            this.emit("error", {
                type: "error",
                content: "Error playing audio",
            })
            this.speaker = undefined
        }
    }

    isReady() {
        return !this.isProcessing && !this.isListening
    }

    async end() {
        try {
            this.stopListening()
            if (this.speaker) {
                this.speaker.end()
                this.speaker = undefined
            }
            this.client.disconnect()
            this.emit("message", {
                type: "message",
                content: { text: "Conversation ended" },
                role: "system",
            })
            console.log("Conversation ended")
        } catch (err) {
            this.emit("error", {
                type: "error",
                content: "Error ending conversation",
            })
        }
    }
}
