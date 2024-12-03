import microphone from "mic"
import type Speaker from "speaker"
import { Assistant, type AssistantOpts } from "./assistant.ts"
import { AudioBufferSourceNode, AudioContext } from "node-web-audio-api"
import {
  type FormattedItem,
  type Realtime,
  RealtimeClient,
} from "openai-realtime-api"
import type { Tool } from "./tools.ts"
import type { Transform } from "node:stream"

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
  client: RealtimeClient
  speaker?: Speaker
  isListening: boolean = false
  mic?: microphone.Mic
  micInputStream?: Transform
  voice: string

  constructor({
    instructions = null,
    tools = [],
    voice = DEFAULT_VOICE,
    opts = {
      turnDetection: undefined,
      loggerLevel: "INFO",
      allowEnd: false,
    },
  }: {
    instructions: string | null
    tools?: Tool[]
    voice?: string
    opts?: AssistantOpts & {
      turnDetection?: Realtime.TurnDetection
    }
  }) {
    super({ instructions, tools, opts })
    this.voice = voice
    this.client = new RealtimeClient({
      debug: false,
      sessionConfig: {
        voice: this.voice,
        instructions: instructions ?? undefined,
        turn_detection: opts.turnDetection ? undefined : null,
      },
    })
  }

  async start(_greeting?: string) {
    this.logger.info("starting...")
    this.emit(EventType.SETTING_UP)
    this.tools.forEach((tool) => {
      this.client.addTool(
        tool.definition.function as Realtime.PartialToolDefinition,
        tool.handler,
      )
    })
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

  lastUserSpeakingTime: number = 0
  userSpeakingTimeoutThreshold: number = 2000

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
      if (!this.micInputStream) {
        this.logger.error("Error getting audio stream")
        this.emit(EventType.ERROR, {
          error: new Error("Failed to get audio stream"),
        })
        return
      }

      this.micInputStream.on("error", (error: Error) => {
        this.logger.error("Error starting microphone", error)
        this.emit(EventType.ERROR, { error })
      })

      this.mic.start()
      this.logger.info("microphone started.")

      let buf = new Uint8Array(0)
      const chunkSize = 4800
      this.micInputStream.on("data", (data: Uint8Array) => {
        if (!this.isListening) return
        const newBuf = new Uint8Array(buf.length + data.length)
        newBuf.set(buf)
        newBuf.set(data, buf.length)
        buf = newBuf

        while (buf.length >= chunkSize) {
          const chunk = buf.slice(0, chunkSize)
          buf = buf.slice(chunkSize)

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
      const audioContext = new AudioContext()
      const buffer = audioContext.createBuffer(
        1,
        audioData.length,
        this.client.conversation.frequency,
      )
      const channelData = buffer.getChannelData(0)

      // Convert Int16Array to Float32Array
      for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i] / 32768.0
      }

      const source = new AudioBufferSourceNode(audioContext, { buffer })
      source.connect(audioContext.destination)

      await new Promise((resolve, _reject) => {
        source.onended = () => {
          audioContext.close()
          resolve(null)
        }
        // TODO
        // source.onerror = (err: any) => {
        //   audioContext.close()
        //   reject(err)
        // }
        source.start()
      })
    } catch (err) {
      this.logger.error("error playing audio", err)
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

  static new(): VoiceAssistantBuilder {
    return new VoiceAssistantBuilder()
  }
}

export class VoiceAssistantBuilder extends VoiceAssistant {
  constructor() {
    super({
      instructions: null,
      tools: [],
      voice: DEFAULT_VOICE,
      opts: {
        turnDetection: undefined,
        loggerLevel: "INFO",
        allowEnd: false,
      },
    })
  }

  withVoice(voice: string): this {
    this.voice = voice
    return this
  }

  withInstructions(instructions: string | null): this {
    this.instructions = instructions
    if (instructions) {
      this.client.sessionConfig.instructions = instructions
    }
    return this
  }

  withTools(tools: Tool[]): this {
    this.tools = tools
    return this
  }

  withOpts(
    opts: AssistantOpts & { turnDetection?: Realtime.TurnDetection },
  ): this {
    this.client.sessionConfig.turn_detection = opts.turnDetection ?? null
    return this
  }

  onMessage(handler: (message: string) => void): this {
    this.on("message", (event) => {
      if (event.content) handler(event.content)
    })
    return this
  }

  onThinking(handler: (message: string) => void): this {
    this.on("thinking", (event) => {
      if (event.content) handler(event.content)
    })
    return this
  }

  onError(handler: (error: string) => void): this {
    this.on("error", (event) => {
      if (event.error) handler(event.error.message)
    })
    return this
  }

  startListening(): this {
    this.start().then(() => {
      this.listen()
    })
    return this
  }
}
