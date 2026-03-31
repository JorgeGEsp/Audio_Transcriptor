import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Mic, 
  Square, 
  Play, 
  FileAudio, 
  FileVideo, 
  Users, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  BrainCircuit
} from 'lucide-react';
import { transcribeMedia } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function TranscriptionApp() {
  const [file, setFile] = useState<File | null>(null);
  const [numSpeakers, setNumSpeakers] = useState(2);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [useHighThinking, setUseHighThinking] = useState(true);
  const [filename, setFilename] = useState("transcripcion");
  const [autoDownload, setAutoDownload] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const downloadTranscription = (text: string, name: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setTranscription(null);
      setError(null);
      // Sugerir nombre basado en el archivo
      const baseName = e.target.files[0].name.split('.').slice(0, -1).join('.');
      setFilename(baseName || "transcripcion");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([blob], "grabacion.webm", { type: 'audio/webm' });
        setFile(recordedFile);
        setIsRecording(false);
        setFilename(`grabacion_${new Date().getTime()}`);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscription(null);
      setError(null);
    } catch (err) {
      setError("No se pudo acceder al micrófono.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setIsTranscribing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const result = await transcribeMedia(base64, file.type, numSpeakers, useHighThinking);
      setTranscription(result);
      
      if (autoDownload) {
        downloadTranscription(result, filename);
      }
    } catch (err: any) {
      setError(err.message || "Error al transcribir el archivo.");
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 min-h-screen">
      <header className="mb-12 border-b border-black pb-8">
        <h1 className="text-5xl font-bold tracking-tighter mb-2 italic">VOZSCRIPT</h1>
        <p className="text-sm uppercase tracking-widest opacity-60">Professional Transcription Engine v1.0</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Controls Column */}
        <div className="lg:col-span-1 space-y-8">
          <section className="space-y-4">
            <label className="col-header block">Entrada de Audio/Vídeo</label>
            <div className="flex flex-col gap-4">
              <div 
                className={`border-2 border-dashed border-black p-8 rounded-lg text-center cursor-pointer transition-colors hover:bg-black hover:text-white group ${file ? 'bg-black text-white' : ''}`}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <input 
                  id="fileInput"
                  type="file" 
                  className="hidden" 
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    {file.type.startsWith('video') ? <FileVideo size={32} /> : <FileAudio size={32} />}
                    <span className="text-xs font-mono truncate max-w-full">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={32} className="group-hover:animate-bounce" />
                    <span className="text-xs font-mono uppercase">Subir Archivo</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 py-4 rounded-lg border border-black flex items-center justify-center gap-2 transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-black hover:text-white'}`}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                  <span className="text-xs font-mono uppercase">{isRecording ? 'Parar' : 'Grabar'}</span>
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <label className="col-header block">Configuración</label>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono uppercase opacity-60">
                  <span>Interlocutores</span>
                  <span>{numSpeakers}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={numSpeakers}
                  onChange={(e) => setNumSpeakers(parseInt(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-black rounded-lg">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={16} />
                  <span className="text-[10px] font-mono uppercase">Alta Precisión</span>
                </div>
                <button 
                  onClick={() => setUseHighThinking(!useHighThinking)}
                  className={`w-10 h-5 rounded-full border border-black relative transition-colors ${useHighThinking ? 'bg-black' : 'bg-transparent'}`}
                >
                  <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-black transition-all ${useHighThinking ? 'right-1 bg-white' : 'left-1 bg-black'}`} />
                </button>
              </div>

              <div className="space-y-4 p-4 border border-black rounded-lg bg-white/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase opacity-60">Nombre del archivo</label>
                  <input 
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="Nombre del archivo..."
                    className="w-full bg-transparent border-b border-black text-xs font-mono py-1 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase">Descarga Automática</span>
                  <button 
                    onClick={() => setAutoDownload(!autoDownload)}
                    className={`w-10 h-5 rounded-full border border-black relative transition-colors ${autoDownload ? 'bg-black' : 'bg-transparent'}`}
                  >
                    <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-black transition-all ${autoDownload ? 'right-1 bg-white' : 'left-1 bg-black'}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <button
            disabled={!file || isTranscribing}
            onClick={handleTranscribe}
            className="w-full py-6 bg-black text-white rounded-lg flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            {isTranscribing ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span className="text-sm font-mono uppercase tracking-widest">Procesando...</span>
              </>
            ) : (
              <>
                <Play size={24} />
                <span className="text-sm font-mono uppercase tracking-widest">Iniciar Transcripción</span>
              </>
            )}
          </button>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start gap-3"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="text-xs font-mono">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-2 border-l border-black pl-0 lg:pl-12 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <label className="col-header">Resultado de la Transcripción</label>
            <div className="flex items-center gap-4">
              {transcription && (
                <button 
                  onClick={() => downloadTranscription(transcription, filename)}
                  className="flex items-center gap-2 px-3 py-1 border border-black rounded hover:bg-black hover:text-white transition-colors"
                >
                  <Upload size={12} className="rotate-180" />
                  <span className="text-[10px] font-mono uppercase">Descargar TXT</span>
                </button>
              )}
              {transcription && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 size={14} />
                  <span className="text-[10px] font-mono uppercase">Completado</span>
                </div>
              )}
            </div>
          </div>


          <div className="bg-white border border-black rounded-lg p-8 min-h-[500px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {!transcription && !isTranscribing && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4 py-24">
                <FileAudio size={64} />
                <p className="text-xs font-mono uppercase tracking-widest">Esperando archivo para procesar</p>
              </div>
            )}

            {isTranscribing && (
              <div className="h-full flex flex-col items-center justify-center space-y-6 py-24">
                <Loader2 size={48} className="animate-spin" />
                <div className="text-center space-y-2">
                  <p className="text-xs font-mono uppercase tracking-widest animate-pulse">Analizando audio...</p>
                  <p className="text-[10px] opacity-60 max-w-[200px]">Esto puede tardar unos minutos dependiendo de la duración del archivo.</p>
                </div>
              </div>
            )}

            {transcription && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="markdown-body text-sm leading-relaxed font-sans"
              >
                <ReactMarkdown>{transcription}</ReactMarkdown>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-24 pt-8 border-t border-black flex justify-between items-center opacity-40">
        <span className="text-[10px] font-mono uppercase">© 2026 VozScript Systems</span>
        <div className="flex gap-4">
          <span className="text-[10px] font-mono uppercase">Privacy</span>
          <span className="text-[10px] font-mono uppercase">Terms</span>
        </div>
      </footer>
    </div>
  );
}
