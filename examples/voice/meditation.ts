import { VoiceAssistant } from "../../src/assistant-voice.ts"

async function main() {
  const assistant = new VoiceAssistant({
    instructions: `
        INSTRUCTIONS:
        you are a meditation assistant.
        you will guide the user through a meditation session.
        you will provide calming and soothing instructions to the user.
        `,
    tools: [],
  })

  await assistant.start()
  if (assistant.isReady()) {
    assistant.listen()
  }
}

main()
