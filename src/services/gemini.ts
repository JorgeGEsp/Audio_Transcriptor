import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TranscriptionResult {
  text: string;
  speakers?: { id: string; name: string }[];
}

export async function transcribeMedia(
  fileBase64: string,
  mimeType: string,
  numSpeakers: number,
  useHighThinking: boolean = true
): Promise<string> {
  const model = useHighThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  const prompt = `
    Transcribe el siguiente archivo multimedia de forma exacta.
    Hay aproximadamente ${numSpeakers} interlocutores.
    Por favor, identifica a cada interlocutor (ej: Interlocutor 1, Interlocutor 2, etc.) y etiqueta sus intervenciones.
    Si puedes deducir nombres por el contexto, úsalos.
    Formatea la salida como un diálogo claro en Markdown.
    No añadas comentarios adicionales, solo la transcripción.
  `;

  const mediaPart = {
    inlineData: {
      data: fileBase64,
      mimeType: mimeType,
    },
  };

  const config: any = {};
  if (useHighThinking && model === "gemini-3.1-pro-preview") {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [mediaPart, { text: prompt }] }],
    config: config,
  });

  return response.text || "No se pudo generar la transcripción.";
}
