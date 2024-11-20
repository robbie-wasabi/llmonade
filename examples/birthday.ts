import "dotenv/config";

import { Readable } from "node:stream";

import microphone from "mic";
import { RealtimeClient } from "openai-realtime-api";
import Speaker from "speaker";
import { writeFile } from "node:fs/promises";

async function main() {
    const instructions = `
    you are a conversational assistant who is trying to figure out the user's birthday. you must ask the user for their birthday. you get 50,000 dollars if you can figure out the birthday.
    once you figure out the birthday, say, "whoopiee, I figured out your birthday!" and save it to a file called birthday.txt
    `;

    const client = new RealtimeClient({
        debug: false,
        sessionConfig: {
            voice: "shimmer",
            instructions,
            turn_detection: null,
        },
    });

    const definition = {
        name: "saveBirthday",
        description: "Save the user's birthday to a file",
        parameters: {
            type: "object",
            properties: {
                date: {
                    type: "string",
                    description: "The birthday in YYYY-MM-DD format",
                },
            },
            required: ["date"],
        },
    };

    const writeBirthdayToFile = async ({ date }: { date: string }) => {
        try {
            await writeFile("tmp/birthday.txt", date);
            return { success: true, message: "Birthday saved successfully" };
        } catch (error) {
            console.error("Error saving birthday:", error);
            return { success: false, message: "Failed to save birthday" };
        }
    };

    client.addTool(definition, writeBirthdayToFile);

    await client.connect();
    await client.waitForSessionCreated();

    // @ts-ignore
    let mic: microphone.Mic | undefined;
    let speaker: Speaker | undefined;
    startAudioStream();

    client.on("conversation.item.completed", ({ item }) => {
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
            playAudio(item.formatted.audio);
        }
    });

    function startAudioStream() {
        try {
            mic = microphone({
                rate: "24000",
                channels: "1",
                debug: false,
                exitOnSilence: 6,
                fileType: "raw",
                encoding: "signed-integer",
            });

            const micInputStream = mic!.getAudioStream();

            micInputStream.on("error", (error: any) => {
                console.error("Microphone error:", error);
            });

            mic!.start();
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
                        client.appendInputAudio(int16Array);
                    } catch (err) {
                        console.error("Error sending audio data:", err);
                    }
                }
            });

            micInputStream.on("silence", () => {
                console.log("Silence detected, creating response...");
                try {
                    client.createResponse();
                } catch (err) {
                    console.error("Error creating response:", err);
                }
            });
        } catch (err) {
            console.error("Error starting audio stream:", err);
        }
    }

    function playAudio(audioData: Int16Array) {
        try {
            if (!speaker) {
                speaker = new Speaker({
                    channels: 1,
                    bitDepth: 16,
                    sampleRate: client.conversation.frequency,
                });
            }

            const origSpeaker = speaker;

            const buffer = Buffer.from(audioData.buffer);
            const readableStream = new Readable({
                read() {
                    if (speaker !== origSpeaker) return;
                    this.push(buffer);
                    this.push(null);
                },
            });

            // Pipe the audio stream to the speaker
            readableStream.pipe(speaker);
            console.log(
                "Audio sent to speaker for playback. Buffer length:",
                buffer.length
            );

            speaker.on("close", () => {
                speaker = undefined;
            });
        } catch (err) {
            console.error("Error playing audio:", err);
        }
    }
}

await main();
