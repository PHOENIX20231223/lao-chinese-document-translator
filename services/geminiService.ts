// services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TranslationDirection } from "../types";

// 环境变量从 Vite 注入（浏览器端必须以 VITE_ 开头）
const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  throw new Error("VITE_API_KEY environment variable not set");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-1.5-flash";

function buildPrompt(text: string, direction: TranslationDirection) {
  return [
    `You are a professional translator. Translation direction: ${String(direction)}.`,
    `Translate the following content. Output ONLY the translated text, no explanations or extra notes.`,
    text,
  ].join("\n\n");
}

export async function translateDocumentStream(
  text: string,
  direction: TranslationDirection,
  onDelta?: (chunk: string) => void
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const prompt = buildPrompt(text, direction);

  const stream = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  let full = "";
  for await (const chunk of (stream as any).stream) {
    const piece = chunk.text?.();
    if (piece) {
      full += piece;
      onDelta?.(piece);
    }
  }
  await stream.response;
  return full;
}
