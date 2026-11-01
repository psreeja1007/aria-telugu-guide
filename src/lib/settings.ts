// Shared between browser and server.

export type Style = "pure" | "mix";
export type Voice = "pooja" | "kavitha";
export type Pace = "slow" | "normal";

export const VOICES: Record<Voice, string> = {
  pooja: "pooja_te_conversation",
  kavitha: "kavitha_te_conversation",
};

export const PACES: Record<Pace, number> = {
  slow: 0.85,
  normal: 1.0,
};

/** Marker Aria puts before her follow-up suggestions. */
export const NEXT_MARKER = "[[next]]";

export const LIMITS = {
  userMessageChars: 1000,
  historyMessages: 12,
  historyMessageChars: 3000,
  speakChars: 1500,
  audioBytes: 4 * 1024 * 1024,
  recordSeconds: 29,
};

export function isStyle(v: unknown): v is Style {
  return v === "pure" || v === "mix";
}
export function isVoice(v: unknown): v is Voice {
  return v === "pooja" || v === "kavitha";
}
export function isPace(v: unknown): v is Pace {
  return v === "slow" || v === "normal";
}
