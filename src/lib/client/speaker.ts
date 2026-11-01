"use client";

import type { Pace, Voice } from "@/lib/settings";

type Listener = () => void;

/**
 * Plays Aria's voice. Text arrives sentence by sentence while the answer streams;
 * each piece is turned into audio right away and played in order.
 * Uses Web Audio so playback still works after async work (needed on phones),
 * as long as unlock() was called during a tap.
 */
class Speaker {
  private ctx: AudioContext | null = null;
  private session = 0;
  private queue: Promise<AudioBuffer | null>[] = [];
  private looping = false;
  private ended = true;
  private source: AudioBufferSourceNode | null = null;
  private abort: AbortController | null = null;
  private collected: AudioBuffer[] = [];
  private failed = false;
  private cache = new Map<string, AudioBuffer[]>();
  private listeners = new Set<Listener>();

  /** Id of the message being spoken, or null. */
  speakingId: string | null = null;
  onError: (() => void) | null = null;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.speakingId;
  private emit() {
    for (const l of this.listeners) l();
  }

  /** Call inside a click/tap handler so the browser allows sound. */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  /** Start a new spoken reply (stops whatever is playing). */
  begin(id: string, voice: Voice, pace: Pace) {
    this.stop();
    if (!this.ctx) return;
    this.session++;
    this.speakingId = id;
    this.ended = false;
    this.failed = false;
    this.collected = [];
    this.abort = new AbortController();
    this.voice = voice;
    this.pace = pace;
    this.emit();
  }
  private voice: Voice = "pooja";
  private pace: Pace = "normal";

  push(text: string) {
    if (!this.ctx || this.ended || !this.abort) return;
    const signal = this.abort.signal;
    const ctx = this.ctx;
    const job = fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: this.voice, pace: this.pace }),
      signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`speak ${r.status}`);
        return ctx.decodeAudioData(await r.arrayBuffer());
      })
      .catch((e) => {
        if (!signal.aborted && !this.failed) {
          this.failed = true;
          console.warn("Voice failed", e);
          this.onError?.();
        }
        return null;
      });
    this.queue.push(job);
    void this.loop(this.session);
  }

  /** No more text is coming for this reply. */
  end(cacheKey?: string) {
    this.ended = true;
    this.cacheKey = cacheKey ?? null;
    if (!this.looping && this.queue.length === 0) this.finish(this.session);
  }
  private cacheKey: string | null = null;

  /** Replay a finished message: uses cached audio if we have it. */
  replay(id: string, cacheKey: string, chunks: string[], voice: Voice, pace: Pace) {
    const cached = this.cache.get(`${cacheKey}|${voice}|${pace}`);
    this.begin(id, voice, pace);
    if (!this.ctx) return;
    if (cached) {
      for (const b of cached) this.queue.push(Promise.resolve(b));
      void this.loop(this.session);
      this.end();
      return;
    }
    for (const c of chunks) this.push(c);
    this.end(cacheKey);
  }

  stop() {
    this.session++;
    this.abort?.abort();
    this.abort = null;
    this.queue = [];
    this.ended = true;
    try {
      this.source?.stop();
    } catch {}
    this.source = null;
    if (this.speakingId !== null) {
      this.speakingId = null;
      this.emit();
    }
  }

  private async loop(session: number) {
    if (this.looping) return;
    this.looping = true;
    try {
      while (session === this.session && this.queue.length) {
        const buf = await this.queue.shift()!;
        if (session !== this.session) return;
        if (buf) {
          this.collected.push(buf);
          await this.play(buf);
        }
      }
    } finally {
      this.looping = false;
    }
    if (session === this.session) {
      if (this.ended && this.queue.length === 0) this.finish(session);
      else if (this.queue.length) void this.loop(session);
    }
  }

  private play(buf: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.ctx!;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      this.source = src;
      src.start();
    });
  }

  private finish(session: number) {
    if (session !== this.session) return;
    if (this.cacheKey && !this.failed && this.collected.length) {
      this.cache.set(`${this.cacheKey}|${this.voice}|${this.pace}`, this.collected);
      if (this.cache.size > 30) this.cache.delete(this.cache.keys().next().value!);
    }
    this.cacheKey = null;
    this.speakingId = null;
    this.emit();
  }
}

export const speaker = new Speaker();
