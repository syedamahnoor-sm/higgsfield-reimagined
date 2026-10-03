import type { TranscriptResult, TranscriptSegment } from "@/store/audio";
import { MAX_TRANSCRIBE_BYTES, TRANSCRIBE_FORMATS_LABEL } from "./transcribe-limits";

/**
 * Transcription in the browser: the file is posted as-is to /api/transcribe,
 * which calls a speech-to-text model. Nothing is stored on the server.
 */

export class TranscribeError extends Error {}

const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|ogg|oga|webm|flac|aac|mp4)$/i;

export function checkTranscribeFile(file: File) {
  const looksLikeAudio = file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name);
  if (!looksLikeAudio) return `That file isn't audio. Try ${TRANSCRIBE_FORMATS_LABEL}.`;
  if (file.size > MAX_TRANSCRIBE_BYTES) return `That file is larger than ${Math.round(MAX_TRANSCRIBE_BYTES / 1024 / 1024)} MB. Try a shorter clip.`;
  if (!file.size) return "That file is empty.";
  return null;
}

/** Reads the file's duration from its metadata, if the browser can. */
export function probeDuration(file: File) {
  return new Promise<number | undefined>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const done = (d?: number) => {
      URL.revokeObjectURL(url);
      resolve(d !== undefined && Number.isFinite(d) ? d : undefined);
    };
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done();
    audio.src = url;
  });
}

const MESSAGES: Record<string, string> = {
  too_large: "That file is too large to transcribe. Try a shorter clip.",
  invalid_file: "That file couldn't be read as audio.",
  rate_limited: "AI transcription is temporarily unavailable. Your file is still selected — try again later.",
  billing: "AI transcription is temporarily unavailable. Your file is still selected — try again later.",
  rejected: "The transcription model couldn't read this file. Try MP3 or WAV.",
  timeout: "Transcription took too long. Try a shorter clip.",
  not_configured: "Transcription isn't available right now.",
  auth: "Transcription isn't available right now.",
};

export async function transcribeFile(file: File): Promise<TranscriptResult> {
  let response: Response;
  try {
    response = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
  } catch {
    throw new TranscribeError("Couldn't reach the server. Check your connection and try again.");
  }
  if (!response.ok) {
    let key = "failed";
    try {
      const json = (await response.json()) as { error?: string; reason?: string };
      key = json.reason ?? json.error ?? key;
    } catch {}
    throw new TranscribeError(MESSAGES[key] ?? "The transcription service ran into a problem. Try again.");
  }
  const json = (await response.json()) as { text: string; segments?: TranscriptSegment[]; language?: string; duration?: number; wordCount?: number };
  return {
    fileName: file.name,
    fileBytes: file.size,
    text: json.text,
    segments: json.segments ?? [],
    language: json.language,
    duration: json.duration,
    wordCount: json.wordCount,
    createdAt: Date.now(),
  };
}

/** "0:04" style timestamp. */
export function timestamp(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function downloadTranscript(result: TranscriptResult) {
  const blob = new Blob([result.text + "\n"], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.fileName.replace(/\.[^.]+$/, "") || "transcript"}-transcript.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
