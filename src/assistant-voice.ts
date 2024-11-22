import { Readable } from "node:stream"
import microphone from "mic"
import { FormattedItem, RealtimeClient } from "openai-realtime-api"
import Speaker from "speaker"
import { Assistant, AssistantOptions, Tool } from "./assistant.ts"

// explicit for language server
import NodeBuffer from "node:buffer"

const DEFAULT_VOICE = "shimmer"

export const enum EventType {
  // conversation is setting up
  SETTING_UP = "setting_up",
  // conversation is ready to listen for user input
  READY = "ready",
  // listening for user input
  LISTENING = "listening",
  // detected that microphone is active and user is speaking
  USER_SPEAKING = "user_speaking",
  // no audio input detected, user is silent
  WAITING_FOR_USER = "waiting_for_user",
  // user audio input has been sent to the model and is being processed
  AI_RESPONSE_PROCESSING = "ai_response_processing",
  // AI response is now ready to be played
  AI_RESPONSE_READY = "ai_response_ready",
  // AI response is now being played through the speaker
  AI_SPEAKING = "ai_speaking",
  ERROR = "error",
  ENDED = "ended",
}

export type AssistantEvent = {
  type: EventType
  message?: string
  error?: Error
}

export class VoiceAssistant extends Assistant {
  private client: RealtimeClient
  private speaker?: Speaker
  private isListening: boolean = false
  private mic?: microphone.Mic
  private micInputStream?: any

  constructor(
    instructions: string,
    tools: Tool[] = [],
    voice: string = DEFAULT_VOICE,
    opts: AssistantOptions & {
      turnDetection: boolean
    } = {
      turnDetection: false,
      loggerLevel: "INFO",
      allowEnd: false,
    },
  ) {
    super(instructions, tools, opts)
    this.client = new RealtimeClient({
      debug: false,
      sessionConfig: {
        voice,
        instructions: this.instructions,
        turn_detection: opts.turnDetection ? undefined : null,
      },
    })
  }

  async start(greeting?: string) {
    this.logger.info("starting...")
    this.emit(EventType.SETTING_UP)
    this.tools.forEach((tool) =>
      this.client.addTool(tool.definition, tool.handler)
    )
    this.logger.info("connected to client.")
    await this.client.connect()
    this.logger.info("connected to OpenAI.")
    await this.client.waitForSessionCreated()
    this.logger.info("session created.")
    this.emit(EventType.READY)
    this.logger.info("ready.")

    // this.client.on("conversation.item.create", ({ item }) => {
    //   console.log("Item create", item)
    // })

    // this.client.on("conversation.item.created", ({ item }) => {
    //   console.log("Item created", item)
    // })

    // set up listener for when an item (response) is completed (finished processing)
    this.client.on("conversation.item.completed", ({ item }) => {
      const { formatted: _, ...rest } = item
      this.logger.info("AI response ready.")
      this.emit(EventType.AI_RESPONSE_READY, rest)
      this.handleResponseReady(item)
    })
  }

  handleResponseReady(item: FormattedItem) {
    if (!item.formatted?.audio) return
    if (item.role !== "assistant") return
    if (item.type !== "message") return
    this.logger.info(`AI speaking: ${item.formatted.transcript}`)
    this.emit(EventType.AI_SPEAKING, {
      transcript: item.formatted.transcript,
    })
    this.playAudio(item.formatted.audio)
  }

  listen() {
    if (this.isListening) return
    this.logger.info("Listening for user input...")
    this.emit(EventType.LISTENING)
    this.isListening = true

    try {
      this.mic = microphone({
        rate: "24000",
        channels: "1",
        debug: false,
        exitOnSilence: 6,
        fileType: "raw",
        encoding: "signed-integer",
      })

      this.micInputStream = this.mic.getAudioStream()
      this.micInputStream.on("error", (error: any) => {
        this.logger.error("Error starting microphone", error)
        this.emit(EventType.ERROR, {
          type: "error",
          content: "Error starting microphone",
          error,
        })
      })

      this.mic.start()
      this.logger.info("microphone started.")

      let buf: any = NodeBuffer.Buffer.alloc(0)
      const chunkSize = 4800 // 0.2 seconds of audio at 24kHz

      this.micInputStream.on("data", (data: NodeBuffer.Buffer) => {
        // @ts-ignore
        this.logger.info(`Data received: ${data.length} bytes`)
        if (!this.isListening) return

        buf = NodeBuffer.Buffer.concat([buf, data])
        while (buf.length >= chunkSize) {
          const chunk = buf.subarray(0, chunkSize)
          buf = buf.subarray(chunkSize)

          const int16Array = new Int16Array(
            chunk.buffer,
            chunk.byteOffset,
            chunk.length / 2,
          )

          try {
            this.client.appendInputAudio(int16Array)
          } catch (err) {
            this.logger.error("Error sending audio data", err)
          }
        }
      })

      this.micInputStream.on("silence", () => {
        this.logger.info("silence detected")
        this.isProcessing = true
        try {
          if (!this.client.isConnected) return
          this.client.createResponse()
        } catch (err) {
          this.logger.error("Error creating response", err)
        }
      })
    } catch (err) {
      this.logger.error("Error starting audio stream", err)
    }
    this.logger.info("Listening for user input...")
  }

  stopListening() {
    if (!this.isListening) return
    this.isListening = false

    if (this.speaker) {
      this.speaker.end()
      this.speaker = undefined
    }
    if (this.mic) {
      this.mic.stop()
      this.mic = undefined
    }
    if (this.micInputStream) {
      this.micInputStream.removeAllListeners()
      this.micInputStream = undefined
    }

    this.logger.info("stopped listening.")
  }

  private async playAudio(audioData: Int16Array) {
    try {
      if (!this.speaker) {
        this.speaker = new Speaker({
          channels: 1,
          bitDepth: 16,
          sampleRate: this.client.conversation.frequency,
        })
      }

      const buf: any = NodeBuffer.Buffer.from(audioData.buffer)
      const readableStream = new Readable({
        read() {
          this.push(buf)
          this.push(null)
        },
      })

      await new Promise((resolve, reject) => {
        this.speaker!.on("finish", () => {
          this.speaker?.end()
          this.speaker = undefined
          resolve(null)
        })

        this.speaker!.on("error", (err) => {
          this.logger.error("speaker error", err)
          this.speaker = undefined
          reject(err)
        })

        readableStream.pipe(this.speaker!)
      })

      this.logger.info("playing audio response")
    } catch (err) {
      this.logger.error("error playing audio", err)
      this.speaker = undefined
    }
  }

  async end() {
    try {
      await this.client.disconnect()
      await this.stopListening()
      this.emit(EventType.ENDED)
    } catch (error) {
      this.logger.error("error ending conversation", error)
      this.emit(EventType.ERROR, {
        type: "error",
        content: "Error ending conversation",
        error,
      })
    }
  }
}
