"use client";

import { LIMITS } from "@/lib/settings";

export type RecorderError = "denied" | "unsupported";

/** Records one voice message from the mic. Stops by itself at the 30-second limit. */
export class Recorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private done: ((b: Blob | null) => void) | null = null;
  private cancelled = false;

  static supported(): boolean {
    return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  }

  /** Starts recording. Resolves with the audio when stopped (or null if cancelled). */
  async start(onAutoStop: () => void): Promise<{ audio: Promise<Blob | null> }> {
    if (!Recorder.supported()) throw "unsupported" satisfies RecorderError;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch {
      throw "denied" satisfies RecorderError;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((m) =>
      MediaRecorder.isTypeSupported?.(m),
    );
    this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.cancelled = false;
    const result = new Promise<Blob | null>((resolve) => (this.done = resolve));
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.onstop = () => {
      const blob = !this.cancelled && this.chunks.length ? new Blob(this.chunks, { type: this.rec?.mimeType || mimeType || "audio/webm" }) : null;
      this.cleanup();
      this.done?.(blob);
      this.done = null;
    };
    this.rec.start();
    this.timer = setTimeout(() => {
      this.stop();
      onAutoStop();
    }, LIMITS.recordSeconds * 1000);
    return { audio: result };
  }

  stop() {
    if (this.rec && this.rec.state !== "inactive") this.rec.stop();
  }

  cancel() {
    this.cancelled = true;
    this.stop();
  }

  private cleanup() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((tr) => tr.stop());
    this.stream = null;
  }
}
