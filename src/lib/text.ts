import { NEXT_MARKER } from "@/lib/settings";

/**
 * Split Aria's raw reply into the visible answer and the follow-up suggestions.
 * While streaming, a half-written marker at the end (e.g. "[[ne") is hidden.
 */
export function splitReply(raw: string): { answer: string; suggestions: string[] } {
  const idx = raw.indexOf(NEXT_MARKER);
  if (idx === -1) {
    let answer = raw;
    for (let n = NEXT_MARKER.length - 1; n > 0; n--) {
      if (answer.endsWith(NEXT_MARKER.slice(0, n))) {
        answer = answer.slice(0, -n);
        break;
      }
    }
    return { answer: answer.trimEnd(), suggestions: [] };
  }
  const suggestions = raw
    .slice(idx + NEXT_MARKER.length)
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 1 && l.length <= 80)
    .slice(0, 3);
  return { answer: raw.slice(0, idx).trimEnd(), suggestions };
}

/** Remove markdown and symbols so the voice reads only words. */
export function toSpeakable(text: string): string {
  return text
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*#+\s*/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const SENTENCE_END = /[.!?।|\n]/;

/**
 * Pulls ready-to-speak chunks out of a growing text buffer.
 * The first chunk is short so Aria starts talking quickly; later ones are longer
 * so there are fewer voice requests.
 */
export class SentenceChunker {
  private spoken = 0;
  private count = 0;

  /** Returns chunks that are complete in `text` (the full visible answer so far). */
  take(text: string, final = false): string[] {
    const out: string[] = [];
    while (true) {
      const rest = text.slice(this.spoken);
      if (!rest.trim()) break;
      const min = this.count === 0 ? 20 : 120;
      const cut = findCut(rest, min, final);
      if (cut === -1) break;
      const piece = toSpeakable(rest.slice(0, cut));
      this.spoken += cut;
      if (piece) {
        out.push(piece);
        this.count++;
      }
    }
    return out;
  }
}

function findCut(rest: string, min: number, final: boolean): number {
  const max = 450;
  let cut = -1;
  for (let i = 0; i < rest.length && i < max; i++) {
    if (SENTENCE_END.test(rest[i])) {
      // Don't cut inside "1." step numbers or decimals like "2.5".
      if (
        rest[i] === "." &&
        /\d/.test(rest[i - 1] ?? "") &&
        (/\d/.test(rest[i + 1] ?? "") || /(^|\s)\d{1,2}$/.test(rest.slice(Math.max(0, i - 4), i)))
      ) {
        continue;
      }
      cut = i + 1;
      if (cut >= min) return cut;
    }
  }
  if (final) return rest.length <= max ? rest.length : cut > 0 ? cut : max;
  if (rest.length >= max) return cut > 0 ? cut : max;
  return -1;
}

/** Does this reply touch money or personal data? Then show the fixed safety note. */
export function mentionsMoney(text: string): boolean {
  return /\b(UPI|OTP|PIN|bank|loan|scam|fraud|PhonePe|GPay|Paytm|card|password)\b|యూపీఐ|ఓటీపీ|పిన్|బ్యాంక్|బ్యాంకు|డబ్బు|లోన్|మోసం|మోసాలు|పాస్‌వర్డ్|కార్డ్/i.test(
    text,
  );
}
