import "dotenv/config"
import { VoiceAssistant } from "../../src/assistant-voice.ts"
import { kbTool } from "../../src/tools.ts"
import { TextAssistant } from "../../src/assistant-text.ts"

async function main() {
  const teacher = new TextAssistant({
    instructions:
      "You are a professor of logic at the university of science and you love to teach. Keep your responses focused and under 2 sentences when possible. Always end with a question for the student.",
  })

  const student = new TextAssistant({
    instructions:
      "You are a student at the university of science trying to learn logic. You're eager but sometimes confused. Always respond to the teacher's questions and ask for clarification when needed.",
  })

  // Start the conversation
  await teacher.start()
  await student.start()

  // Initial prompt to get the conversation going
  const initialMessage = await teacher.sendMessage(
    "Let's begin our logic lesson. What do you know about syllogisms?",
  )
  console.log("Teacher:", initialMessage)

  // Conversation loop
  let currentMessage = initialMessage
  for (let i = 0; i < 5; i++) { // Limit to 5 exchanges
    // Student's turn
    const studentResponse = await student.sendMessage(currentMessage)
    console.log("Student:", studentResponse)

    // Teacher's turn
    currentMessage = await teacher.sendMessage(studentResponse)
    console.log("Teacher:", currentMessage)

    // Small delay between exchanges
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

main().catch(console.error)
