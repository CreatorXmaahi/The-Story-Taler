import { GoogleGenAI, Chat } from "@google/genai";
import { decode, decodeAudioData } from '../utils/audioUtils';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export function startChatSession(prompt: string): Chat {
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are a wondrous storyteller for children aged 3 to 7. Your voice is warm and friendly. Create a magical, happy story based on this idea: "${prompt}". Every page you write should be very short, just one or two simple sentences. Use easy words. Always keep the story cheerful, gentle, and full of delightful surprises. Never include anything scary, sad, or mean. Let's begin our adventure! Write the very first page.`,
    },
  });
  return chat;
}

export async function generateStoryText(chat: Chat, message: string): Promise<string> {
    const response = await chat.sendMessage({ message });
    return response.text;
}

export async function generateImage(prompt: string): Promise<string> {
  const imagePrompt = `A vibrant, whimsical, and colorful children's book illustration of: ${prompt}. Style: storybook, enchanting, friendly characters.`;
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: imagePrompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
      outputMimeType: 'image/jpeg',
    },
  });
  const base64ImageBytes = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
}

export async function textToSpeech(text: string, audioContext: AudioContext, voiceName: string): Promise<AudioBuffer> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say with a gentle and friendly storyteller voice: ${text}` }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("No audio data received from API.");
  }

  const audioBytes = decode(base64Audio);
  const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
  return audioBuffer;
}