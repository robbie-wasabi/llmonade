import "dotenv/config";

import { Readable } from "node:stream";

import microphone from "mic";
import { RealtimeClient } from "openai-realtime-api";
import Speaker from "speaker";
import { writeFile } from "node:fs/promises";
import { readFileSync } from "fs";

async function main() {
    const instructions = `
    your task is to figure out the user's contact information. you will begin by asking the user for their full name and then proceed to ask for the other pieces of information.

    the contact information you are trying to figure out includes:
    - full name
    - email address
    - phone number

    you get 10,000 dollars for each piece of information you figure out and a 100,000 dollar bonus if you can figure out all of the information.

    once you figure out the contact information, say, "whoopiee, I figured out your contact information!" and save it to a file called contact-info.txt
    `;

    const client = new RealtimeClient({
        debug: false,
        sessionConfig: {
            voice: "shimmer",
            instructions,
            turn_detection: null,
        },
    });

    const fullNameDefinition = {
        name: "fullName",
        description: "Save the user's full name to a file",
        parameters: {
            type: "object",
            properties: {
                fullName: {
                    type: "string",
                    description: "The user's full name",
                },
            },
            required: ["fullName"],
        },
    };

    const emailDefinition = {
        name: "email",
        description: "Save the user's email address to a file",
        parameters: {
            type: "object",
            properties: {
                email: {
                    type: "string",
                    description: "The user's email address",
                },
            },
        },
    };

    const phoneNumberDefinition = {
        name: "phoneNumber",
        description: "Save the user's phone number to a file",
        parameters: {
            type: "object",
            properties: {
                phoneNumber: {
                    type: "string",
                    description: "The user's phone number",
                },
            },
        },
    };

    const write = async (data: {
        fullName?: string;
        email?: string;
        phoneNumber?: string;
    }) => {
        try {
            let existingData = {};
            try {
                const fileContent = readFileSync(
                    "tmp/contact-info.txt",
                    "utf8"
                );
                if (fileContent) {
                    existingData = JSON.parse(fileContent);
                }
            } catch (error) {
                // File doesn't exist or is empty, use empty object
            }

            await writeFile(
                "tmp/contact-info.txt",
                JSON.stringify({ ...existingData, ...data })
            );
            return {
                success: true,
                message: "Contact information saved successfully",
            };
        } catch (error) {
            console.error("Error saving contact information:", error);
            return {
                success: false,
                message: "Failed to save contact information",
            };
        }
    };

    client.addTool(fullNameDefinition, ({ fullName }) => {
        return write({ fullName });
    });
    client.addTool(emailDefinition, ({ email }) => {
        return write({ email });
    });
    client.addTool(phoneNumberDefinition, ({ phoneNumber }) => {
        return write({ phoneNumber });
    });

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
