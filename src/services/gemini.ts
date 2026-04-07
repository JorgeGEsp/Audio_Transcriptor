export interface TranscriptionResult {
  text: string;
  speakers?: { id: string; name: string }[];
}

export async function transcribeMedia(
  fileBase64: string,
  mimeType: string,
  numSpeakers: number,
  useHighThinking: boolean = true,
  includeAnalysis: boolean = false
): Promise<string> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileBase64,
      mimeType,
      numSpeakers,
      useHighThinking,
      includeAnalysis,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error en la transcripción");
  }

  const data = await response.json();
  return data.text || "No se pudo generar la transcripción.";
}
