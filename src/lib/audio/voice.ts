import { createId } from "@/lib/id";
import { saveLocalMedia } from "@/lib/media/uploads";
import { projectForAsset } from "@/lib/projects";
import type { Asset, VoiceSettings } from "@/lib/types";
import { MAX_SCRIPT_CHARS } from "@/lib/voices";
import { useAudioSession } from "@/store/audio";
import { useStudio } from "@/store/studio";

/**
 * Voice generation in the browser. The browser only talks to /api/audio; the
 * server calls the text-to-speech model. The returned file is stored locally
 * (IndexedDB) and becomes a Library asset, so it never depends on a provider URL.
 */

type Failure = "not_configured" | "auth" | "billing" | "rate_limited" | "rejected" | "timeout" | "failed" | "network" | "invalid";

const MESSAGES: Record<Failure, string> = {
  not_configured: "Voice isn't available right now.",
  auth: "Voice isn't available right now.",
  billing: "AI generation is temporarily unavailable. Your script and settings have been preserved — try again later.",
  rate_limited: "AI generation is temporarily unavailable. Your script and settings have been preserved — try again later.",
  rejected: "The voice model couldn't read this script. Try simpler or shorter text.",
  timeout: "The voice took too long to generate. Try a shorter script.",
  failed: "The voice service ran into a problem. Try again.",
  network: "Couldn't reach the server. Check your connection and try again.",
  invalid: "Check the script and voice settings, then try again.",
};

let availability: Promise<boolean> | null = null;
/** Cached once per page: whether the server has voice configured. */
export function checkVoiceAvailability() {
  availability ??= fetch("/api/audio")
    .then((r) => (r.ok ? r.json() : { available: false }))
    .then((j: { available?: boolean }) => Boolean(j.available))
    .catch(() => false);
  return availability;
}

/**
 * Measures the real duration and peak levels of the audio, for the waveform.
 * Returns empty values if this browser can't decode it (the file still plays).
 */
export async function analyzeAudio(blob: Blob, buckets = 96): Promise<{ duration?: number; peaks?: number[] }> {
  try {
    const Ctx = window.OfflineAudioContext;
    if (!Ctx) return {};
    const ctx = new Ctx(1, 1, 44100);
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buffer.getChannelData(0);
    const size = Math.max(1, Math.floor(data.length / buckets));
    const raw: number[] = [];
    for (let b = 0; b < buckets; b++) {
      let max = 0;
      const end = Math.min(data.length, (b + 1) * size);
      for (let i = b * size; i < end; i += 4) max = Math.max(max, Math.abs(data[i]));
      raw.push(max);
    }
    const top = Math.max(...raw, 0.0001);
    return { duration: buffer.duration, peaks: raw.map((v) => Math.round((v / top) * 100) / 100) };
  } catch {
    return {};
  }
}

async function readFailure(response: Response): Promise<Failure> {
  if (response.status === 400) return "invalid";
  try {
    const json = (await response.json()) as { reason?: string };
    return json.reason && json.reason in MESSAGES ? (json.reason as Failure) : "failed";
  } catch {
    return "failed";
  }
}

/** Generates a voice take; every run creates a new asset, so earlier takes are kept. */
export async function generateVoice(input: VoiceSettings, options: { parentId?: string; projectId?: string } = {}) {
  const session = useAudioSession.getState();
  if (session.run?.status === "running") return;
  const settings: VoiceSettings = { ...input, script: input.script.trim() };
  const projectId = options.projectId && useStudio.getState().projects[options.projectId] ? options.projectId : undefined;
  const run = { id: createId("voice"), status: "running" as const, stage: "Preparing script", settings, parentId: options.parentId, projectId };
  session.setRun(run);
  // A failure never touches the draft: script, voice, language and output settings stay as they were.
  const fail = (message: string, limited = false) => useAudioSession.getState().patchRun(run.id, { status: "failed", error: message, limited });

  if (!settings.script || settings.script.length > MAX_SCRIPT_CHARS) return fail(MESSAGES.invalid);

  try {
    useAudioSession.getState().patchRun(run.id, { stage: "Generating voice" });
    let response: Response;
    try {
      response = await fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {
      return fail(MESSAGES.network);
    }
    if (!response.ok) {
      const reason = await readFailure(response);
      return fail(MESSAGES[reason], reason === "rate_limited" || reason === "billing");
    }

    useAudioSession.getState().patchRun(run.id, { stage: "Processing audio" });
    const blob = await response.blob();
    if (!blob.size) return fail(MESSAGES.failed);
    const model = response.headers.get("x-ember-model") ?? undefined;
    const { duration, peaks } = await analyzeAudio(blob);
    const url = await saveLocalMedia(blob);

    const asset: Asset = {
      id: createId("asset"),
      kind: "audio",
      url,
      width: 1,
      height: 1,
      settings: { mode: "audio", prompt: settings.script, intent: "auto", aspect: "1:1", count: 1 },
      resolvedModel: "AI voice",
      modelLabel: model,
      parentId: options.parentId,
      favorite: false,
      createdAt: Date.now(),
      jobId: run.id,
      renderer: "file",
      audio: { ...settings, duration, peaks, contentType: blob.type || (settings.format === "wav" ? "audio/wav" : "audio/mpeg"), bytes: blob.size },
    };
    useStudio.getState().addAsset(asset, projectId);
    const after = useAudioSession.getState();
    after.addTake(asset.id);
    after.setRun(null);
    return asset;
  } catch {
    fail(MESSAGES.failed);
  }
}

/** Regenerate: the same script and voice again, as a new take. */
export function regenerateVoice(asset: Asset) {
  if (!asset.audio) return;
  const { script, language, speaker, format, bitRate, sampleRate } = asset.audio;
  // A new take joins the project of the take it came from.
  const projectId = projectForAsset(asset.id) ?? useStudio.getState().projectContext.audio;
  return generateVoice({ script, language, speaker, format, bitRate, sampleRate }, { parentId: asset.parentId, projectId });
}
