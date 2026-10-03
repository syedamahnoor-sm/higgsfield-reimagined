/** Upload limit for transcription, kept under common serverless request-body limits. */
export const MAX_TRANSCRIBE_BYTES = 4 * 1024 * 1024;

export const TRANSCRIBE_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave,audio/ogg,audio/webm,audio/flac,audio/x-flac,audio/mp4,audio/x-m4a,audio/aac";

export const TRANSCRIBE_FORMATS_LABEL = "MP3, WAV, M4A, OGG, WebM or FLAC";
