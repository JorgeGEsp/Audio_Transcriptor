import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase body size limit for audio/video files
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { fileBase64, mimeType, numSpeakers, useHighThinking, includeAnalysis } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY no está configurada en el servidor." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const modelName = useHighThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
      
      let prompt = `
        Transcribe el siguiente archivo multimedia de forma exacta.
        Hay aproximadamente ${numSpeakers} interlocutores.
        Por favor, identifica a cada interlocutor (ej: Interlocutor 1, Interlocutor 2, etc.) y etiqueta sus intervenciones.
        Si puedes deducir nombres por el contexto, úsalos.
        Formatea la salida como un diálogo claro en Markdown.
        No añadas comentarios adicionales, solo la transcripción.
      `;

      if (includeAnalysis) {
        prompt += `
          ADEMÁS de la transcripción, para cada intervención de los interlocutores, añade entre paréntesis o en una línea inferior:
          1. El estado anímico o emoción detectada en esa frase específica (ej: alegre, tenso, dubitativo, sarcástico).
          2. La intención subyacente o análisis psicológico breve (ej: intenta convencer, está manipulando, es sincero, busca aprobación).
          Sé muy específico basándote en el tono de voz, las pausas y la elección de palabras.
        `;
      }

      const mediaPart = {
        inlineData: {
          data: fileBase64,
          mimeType: mimeType,
        },
      };

      const model = (ai as any).getGenerativeModel({ 
        model: modelName,
        ...(useHighThinking && modelName === "gemini-3.1-pro-preview" ? {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        } : {})
      } as any);

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [mediaPart, { text: prompt }] }],
      });

      const response = await result.response;
      res.json({ text: response.text() });
    } catch (error: any) {
      console.error("Error en la transcripción:", error);
      res.status(500).json({ error: error.message || "Error interno del servidor" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
