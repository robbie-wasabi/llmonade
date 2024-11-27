import { VoiceAssistant } from "../../src/assistant-voice.ts"

function main() {
  const teacher = new VoiceAssistant({
    instructions:
      " you are professor of logic at the university of science and you love to teach.  ",
  })
  teacher.start().then(() => teacher.listen())

  const student = new VoiceAssistant({
    instructions:
      " you are a student at the university of science and you are trying to learn logic. ",
  })
  student.start().then(() => student.listen())
}

main()
