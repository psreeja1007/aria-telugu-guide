"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { AriaAvatar } from "@/components/AriaAvatar";
import { Markdown } from "@/components/Markdown";
import { BookIcon, MicIcon, PlusIcon, SendIcon, SettingsIcon, ShieldIcon, SpeakerIcon, StopIcon } from "@/components/icons";
import { Recorder } from "@/lib/client/recorder";
import { speaker } from "@/lib/client/speaker";
import { TOPICS, t, type StringKey } from "@/lib/i18n";
import { LIMITS, isPace, isStyle, isVoice, type Pace, type Style, type Voice } from "@/lib/settings";
import { SentenceChunker, mentionsMoney, splitReply } from "@/lib/text";

type Msg = { id: string; role: "user" | "assistant"; content: string; done: boolean; error?: StringKey };
type Size = "normal" | "large";
type Settings = { style: Style | null; voice: Voice; pace: Pace; autoSpeak: boolean; size: Size };
type Phase = "idle" | "recording" | "transcribing" | "thinking" | "streaming";

const DEFAULTS: Settings = { style: null, voice: "pooja", pace: "normal", autoSpeak: true, size: "normal" };
const SETTINGS_KEY = "aria:settings";
const CHAT_KEY = "aria:chat";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    return {
      style: isStyle(raw.style) ? raw.style : null,
      voice: isVoice(raw.voice) ? raw.voice : DEFAULTS.voice,
      pace: isPace(raw.pace) ? raw.pace : DEFAULTS.pace,
      autoSpeak: typeof raw.autoSpeak === "boolean" ? raw.autoSpeak : DEFAULTS.autoSpeak,
      size: raw.size === "large" ? "large" : "normal",
    };
  } catch {
    return DEFAULTS;
  }
}

function loadChat(): Msg[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(CHAT_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && typeof m.id === "string",
    ).map((m) => ({ id: m.id, role: m.role, content: m.content, done: true, error: m.error }));
  } catch {
    return [];
  }
}

class ApiError extends Error {
  constructor(public key: StringKey) {
    super(key);
  }
}

function errorKey(status: number, code?: string): StringKey {
  if (status === 429 || code === "rate_limited") return "errRate";
  if (status === 402 || code === "no_credits") return "errCredits";
  if (code === "server_config") return "errConfig";
  return "errGeneric";
}

export default function AriaApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [recSeconds, setRecSeconds] = useState(0);
  const [toast, setToast] = useState<StringKey | null>(null);
  const [sheet, setSheet] = useState<"settings" | "topics" | null>(null);
  const speakingId = useSyncExternalStore(speaker.subscribe, speaker.getSnapshot, () => null);

  const style: Style = settings.style ?? "mix";
  const tx = (k: StringKey) => t(style, k);

  const settingsRef = useRef(settings);
  const messagesRef = useRef(messages);
  const busyRef = useRef(false);
  const chatAbort = useRef<AbortController | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  settingsRef.current = settings;
  messagesRef.current = messages;

  // Load saved settings and this tab's conversation.
  useEffect(() => {
    setSettings(loadSettings());
    setMessages(loadChat());
    setLoaded(true);
    speaker.onError = () => setToast("errVoice");
    return () => {
      speaker.onError = null;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
    document.documentElement.dataset.size = settings.size;
  }, [settings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      const done = messages.filter((m) => m.done).slice(-40);
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(done));
    } catch {}
  }, [messages, loaded]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  // Keep the newest message in view.
  const lastLen = messages.length ? messages[messages.length - 1].content.length : 0;
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 260;
    if (nearBottom || lastLen === 0) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, lastLen]);

  const update = (s: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...s }));

  const patchMsg = (id: string, patch: Partial<Msg>) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const send = useCallback(async (rawText: string) => {
    const text = rawText.trim().slice(0, LIMITS.userMessageChars);
    if (!text || busyRef.current) return;
    busyRef.current = true;
    speaker.unlock();
    speaker.stop();

    const s = settingsRef.current;
    const msgStyle: Style = s.style ?? "mix";
    const user: Msg = { id: uid(), role: "user", content: text, done: true };
    const reply: Msg = { id: uid(), role: "assistant", content: "", done: false };
    const history = [...messagesRef.current.filter((m) => m.done && !m.error), user]
      .slice(-LIMITS.historyMessages)
      .map((m) => ({ role: m.role, content: m.role === "assistant" ? splitReply(m.content).answer : m.content }));

    setMessages((prev) => [...prev, user, reply]);
    setInput("");
    setPhase("thinking");

    const ac = new AbortController();
    chatAbort.current = ac;
    const chunker = new SentenceChunker();
    if (s.autoSpeak) speaker.begin(reply.id, s.voice, s.pace);
    let raw = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, style: msgStyle }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(errorKey(res.status, body.error));
      }
      setPhase("streaming");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        patchMsg(reply.id, { content: raw });
        if (s.autoSpeak) for (const c of chunker.take(splitReply(raw).answer)) speaker.push(c);
      }
      raw += decoder.decode();
      const { answer } = splitReply(raw);
      if (!answer) throw new ApiError("errGeneric");
      if (s.autoSpeak) {
        for (const c of chunker.take(answer, true)) speaker.push(c);
        speaker.end(reply.id);
      }
      patchMsg(reply.id, { content: raw, done: true });
    } catch (err) {
      if (ac.signal.aborted) {
        // The user pressed stop: keep what Aria said so far.
        if (splitReply(raw).answer) patchMsg(reply.id, { content: raw, done: true });
        else setMessages((prev) => prev.filter((m) => m.id !== reply.id));
      } else {
        speaker.stop();
        const key = err instanceof ApiError ? err.key : navigator.onLine === false ? "errOffline" : "errGeneric";
        patchMsg(reply.id, { content: "", done: true, error: key });
      }
    } finally {
      chatAbort.current = null;
      busyRef.current = false;
      setPhase("idle");
    }
  }, []);

  const stopAll = () => {
    chatAbort.current?.abort();
    recorder.current?.cancel();
    speaker.stop();
  };

  const toggleMic = async () => {
    if (phase === "recording") {
      recorder.current?.stop();
      return;
    }
    if (phase === "transcribing") return;
    if (busyRef.current) stopAll();
    speaker.unlock();
    speaker.stop();

    const rec = new Recorder();
    recorder.current = rec;
    let result: Promise<Blob | null>;
    try {
      result = (await rec.start(() => {})).audio;
    } catch (e) {
      setToast(e === "denied" ? "errMicDenied" : "errMicUnsupported");
      return;
    }
    setPhase("recording");
    setRecSeconds(0);
    const started = Date.now();
    const timer = setInterval(() => setRecSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    const blob = await result;
    clearInterval(timer);
    recorder.current = null;
    if (!blob || blob.size < 1200) {
      setPhase("idle");
      if (blob) setToast("errNoSpeech");
      return;
    }

    setPhase("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "speech");
      form.append("style", settingsRef.current.style ?? "mix");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(errorKey(res.status, body.error));
      const text = typeof body.text === "string" ? body.text.trim() : "";
      setPhase("idle");
      if (!text) {
        setToast("errNoSpeech");
        return;
      }
      await send(text);
    } catch (err) {
      setPhase("idle");
      setToast(err instanceof ApiError ? err.key : "errGeneric");
    }
  };

  const replay = (m: Msg) => {
    speaker.unlock();
    if (speakingId === m.id) {
      speaker.stop();
      return;
    }
    const chunks = new SentenceChunker().take(splitReply(m.content).answer, true);
    speaker.replay(m.id, m.id, chunks, settings.voice, settings.pace);
  };

  const retry = (errorMsg: Msg) => {
    const idx = messages.findIndex((m) => m.id === errorMsg.id);
    const userMsg = messages[idx - 1];
    if (!userMsg || userMsg.role !== "user") return;
    const rest = messages.slice(0, idx - 1);
    messagesRef.current = rest;
    setMessages(rest);
    void send(userMsg.content);
  };

  const newChat = () => {
    stopAll();
    setMessages([]);
    setInput("");
    window.scrollTo({ top: 0 });
  };

  const pickTopic = (text: string) => {
    setSheet(null);
    void send(text);
  };

  const submit = () => void send(input);

  if (!loaded) return <div className="min-h-dvh" />;

  if (!settings.style) {
    return <Onboarding onPick={(s) => update({ style: s })} />;
  }

  const empty = messages.length === 0;
  const busy = phase === "thinking" || phase === "streaming";
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
      {/* Header */}
      <header
        className="sticky z-20 -mx-4 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <button onClick={newChat} className="flex shrink-0 items-center gap-2 rounded-xl py-1 pe-1" aria-label={tx("newChat")}>
          <AriaAvatar size={36} active={speakingId !== null} />
          <span className="hidden text-lg leading-tight font-bold whitespace-nowrap min-[400px]:inline">
            Aria <span className="hidden font-semibold text-muted sm:inline">· ఆరియా</span>
          </span>
        </button>
        <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
          <StyleToggle style={style} onChange={(s) => update({ style: s })} />
          {!empty && (
            <>
              <IconButton label={tx("topics")} onClick={() => setSheet("topics")}>
                <BookIcon className="size-5" />
              </IconButton>
              <IconButton label={tx("newChat")} onClick={newChat}>
                <PlusIcon className="size-5" />
              </IconButton>
            </>
          )}
          <IconButton label={tx("settings")} onClick={() => setSheet("settings")}>
            <SettingsIcon className="size-5" />
          </IconButton>
        </div>
      </header>

      <main className="flex-1 pb-48">
        {empty ? (
          <>
            <section className="flex flex-col items-center pt-8 pb-6 text-center">
              <AriaAvatar size={88} active={phase === "recording"} />
              <h1 className="mt-4 text-3xl font-bold">{tx("greeting")}</h1>
              <p className="mt-2 max-w-md text-lg text-muted">{tx("tagline")}</p>
              <button
                onClick={toggleMic}
                className={`mt-7 grid size-28 place-items-center rounded-full shadow-lg transition active:scale-95 ${
                  phase === "recording" ? "pulse bg-accent text-[#2b2a6b]" : "bg-primary text-primary-ink"
                }`}
                aria-label={tx("tapToSpeak")}
              >
                {phase === "recording" ? <StopIcon className="size-11" /> : <MicIcon className="size-12" />}
              </button>
              <p className="mt-3 text-lg font-semibold">{phase === "recording" ? tx("listening") : tx("tapToSpeak")}</p>
              <p className="text-muted">{tx("orType")}</p>
            </section>
            <TopicExplorer style={style} onPick={pickTopic} />
            <p className="mt-8 text-center text-sm text-muted">
              {tx("disclaimer")}{" "}
              <Link href="/about" className="underline">
                {tx("about")}
              </Link>
            </p>
          </>
        ) : (
          <ol className="space-y-5 pt-5" aria-live="polite">
            {messages.map((m) =>
              m.role === "user" ? (
                <li key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-user px-4 py-2.5 text-lg text-user-ink">
                    {m.content}
                  </div>
                </li>
              ) : (
                <AssistantMessage
                  key={m.id}
                  msg={m}
                  style={style}
                  speaking={speakingId === m.id}
                  isLast={m.id === lastAssistant?.id}
                  busy={busy}
                  onReplay={() => replay(m)}
                  onRetry={() => retry(m)}
                  onSuggest={(q) => void send(q)}
                />
              ),
            )}
          </ol>
        )}
        <div ref={bottomRef} />
      </main>

      {/* Composer */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto max-w-2xl px-4 pt-2 pb-3">
          <StatusLine
            style={style}
            phase={phase}
            seconds={recSeconds}
            speaking={speakingId !== null}
            onStop={stopAll}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2"
          >
            <button
              type="button"
              onClick={toggleMic}
              disabled={phase === "transcribing"}
              aria-label={phase === "recording" ? tx("stop") : tx("tapToSpeak")}
              className={`grid size-12 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-50 sm:size-14 ${
                phase === "recording" ? "pulse bg-accent text-[#2b2a6b]" : "bg-accent-soft text-ink"
              }`}
            >
              {phase === "recording" ? <StopIcon className="size-6" /> : <MicIcon className="size-7" />}
            </button>
            <label className="sr-only" htmlFor="aria-input">
              {tx("placeholder")}
            </label>
            <textarea
              id="aria-input"
              ref={inputRef}
              value={input}
              rows={1}
              maxLength={LIMITS.userMessageChars}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={tx("placeholder")}
              className="min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-card px-3 py-2.5 text-lg placeholder:text-muted focus:border-accent focus:outline-none sm:min-h-14 sm:px-4 sm:py-3"
            />
            {busy ? (
              <button
                type="button"
                onClick={stopAll}
                aria-label={tx("stop")}
                className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-ink active:scale-95 sm:size-14"
              >
                <StopIcon className="size-6" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label={tx("send")}
                className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-ink transition active:scale-95 disabled:opacity-40 sm:size-14"
              >
                <SendIcon className="size-6" />
              </button>
            )}
          </form>
        </div>
      </div>

      {toast && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-36 z-30 mx-auto max-w-md rounded-2xl bg-warn-bg px-4 py-3 text-center font-semibold text-warn-ink shadow-lg"
          onClick={() => setToast(null)}
        >
          {tx(toast)}
        </div>
      )}

      {sheet && (
        <Sheet title={sheet === "settings" ? tx("settings") : tx("exploreTitle")} closeLabel={tx("close")} onClose={() => setSheet(null)}>
          {sheet === "settings" ? (
            <SettingsPanel settings={settings} style={style} update={update} />
          ) : (
            <TopicExplorer style={style} onPick={pickTopic} compact />
          )}
        </Sheet>
      )}
    </div>
  );
}

/* ---------- Pieces ---------- */

function AssistantMessage({
  msg,
  style,
  speaking,
  isLast,
  busy,
  onReplay,
  onRetry,
  onSuggest,
}: {
  msg: Msg;
  style: Style;
  speaking: boolean;
  isLast: boolean;
  busy: boolean;
  onReplay: () => void;
  onRetry: () => void;
  onSuggest: (q: string) => void;
}) {
  const { answer, suggestions } = splitReply(msg.content);
  return (
    <li className="flex gap-3" data-role="assistant" data-done={msg.done ? "true" : "false"}>
      <AriaAvatar size={34} active={speaking} />
      <div className="min-w-0 flex-1">
        {msg.error ? (
          <div className="rounded-2xl bg-warn-bg px-4 py-3 text-warn-ink">
            <p className="font-semibold">{t(style, msg.error)}</p>
            {isLast && (
              <button onClick={onRetry} className="mt-2 rounded-full border border-current px-4 py-1 font-semibold">
                ↻ {style === "pure" ? "మళ్ళీ ప్రయత్నించు" : "Retry"}
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3 text-lg">
            {answer ? (
              <Markdown text={answer} />
            ) : (
              <span className="inline-flex gap-1 py-2 text-2xl leading-none" aria-label={t(style, "thinking")}>
                <span className="dot">●</span>
                <span className="dot">●</span>
                <span className="dot">●</span>
              </span>
            )}
          </div>
        )}

        {msg.done && answer && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={onReplay}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-base font-semibold"
              aria-pressed={speaking}
            >
              {speaking ? <StopIcon className="size-4" /> : <SpeakerIcon className="size-5" />}
              {speaking ? t(style, "stop") : t(style, "replay")}
            </button>
          </div>
        )}

        {msg.done && answer && mentionsMoney(answer) && (
          <div className="mt-3 flex gap-2 rounded-2xl bg-warn-bg px-4 py-3 text-base text-warn-ink">
            <ShieldIcon className="mt-1 size-5 shrink-0" />
            <p>{t(style, "safety")}</p>
          </div>
        )}

        {isLast && msg.done && !busy && suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => onSuggest(q)}
                className="rounded-full bg-accent-soft px-4 py-2 text-start text-base font-semibold text-ink transition active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function StatusLine({
  style,
  phase,
  seconds,
  speaking,
  onStop,
}: {
  style: Style;
  phase: Phase;
  seconds: number;
  speaking: boolean;
  onStop: () => void;
}) {
  let label: string | null = null;
  if (phase === "recording") label = `${t(style, "listening")} ${seconds}s / ${LIMITS.recordSeconds}s`;
  else if (phase === "transcribing") label = t(style, "transcribing");
  else if (phase === "thinking") label = t(style, "thinking");
  else if (speaking) label = `🔊 ${t(style, "speaking")}...`;
  if (!label) return null;
  return (
    <div className="mb-2 flex items-center justify-between gap-2 text-base font-semibold text-muted" aria-live="polite">
      <span>{label}</span>
      {speaking && phase === "idle" && (
        <button onClick={onStop} className="rounded-full border border-line px-3 py-0.5 text-ink">
          {t(style, "stop")}
        </button>
      )}
    </div>
  );
}

function TopicExplorer({ style, onPick, compact }: { style: Style; onPick: (q: string) => void; compact?: boolean }) {
  return (
    <section aria-labelledby={compact ? undefined : "explore-title"}>
      {!compact && (
        <>
          <h2 id="explore-title" className="text-xl font-bold">
            {t(style, "exploreTitle")}
          </h2>
          <p className="mb-4 text-muted">{t(style, "exploreHint")}</p>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {TOPICS.map((topic) => (
          <div key={topic.color} className={`topic-${topic.color} rounded-2xl p-4`}>
            <h3 className="mb-2 text-lg font-bold">
              <span aria-hidden>{topic.emoji}</span> {topic.title[style]}
            </h3>
            <ul className="space-y-1.5">
              {topic.items.map((item) => (
                <li key={item[style]}>
                  <button
                    onClick={() => onPick(item[style])}
                    className="w-full rounded-xl bg-card/70 px-3 py-2 text-start text-base font-semibold text-ink transition hover:bg-card active:scale-[0.98]"
                  >
                    {item[style]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function StyleToggle({ style, onChange }: { style: Style; onChange: (s: Style) => void }) {
  return (
    <div role="radiogroup" aria-label={t(style, "styleQuestion")} className="flex rounded-full border border-line bg-card p-0.5 text-sm font-bold">
      {(["pure", "mix"] as const).map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={style === s}
          onClick={() => onChange(s)}
          className={`rounded-full px-2.5 py-1 ${style === s ? "bg-primary text-primary-ink" : "text-muted"}`}
        >
          {s === "pure" ? "తెలుగు" : "Te+En"}
        </button>
      ))}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-full text-ink hover:bg-card active:scale-95 sm:size-10"
    >
      {children}
    </button>
  );
}

function Sheet({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-bg p-5 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full border border-line px-4 py-1 font-semibold">
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  style,
  update,
}: {
  settings: Settings;
  style: Style;
  update: (s: Partial<Settings>) => void;
}) {
  const tx = (k: StringKey) => t(style, k);
  const sample = (voice: Voice) => {
    speaker.unlock();
    speaker.replay("sample", `sample-${style}`, [tx("voiceSample")], voice, settings.pace);
  };
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 font-bold">{tx("styleQuestion")}</legend>
        <StyleCards value={style} onPick={(s) => update({ style: s })} />
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-bold">{tx("voiceLabel")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["pooja", "kavitha"] as const).map((v) => (
            <div
              key={v}
              className={`flex items-center justify-between rounded-2xl border-2 bg-card px-4 py-3 ${
                settings.voice === v ? "border-accent" : "border-line"
              }`}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name="voice"
                  checked={settings.voice === v}
                  onChange={() => update({ voice: v })}
                  className="size-5 accent-[var(--accent)]"
                />
                {tx(v === "pooja" ? "voice1" : "voice2")}
              </label>
              <button
                onClick={() => sample(v)}
                className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 font-semibold"
              >
                <SpeakerIcon className="size-4" /> {tx("tryVoice")}
              </button>
            </div>
          ))}
        </div>
      </fieldset>

      <Choice
        label={tx("autoSpeak")}
        value={settings.autoSpeak ? "on" : "off"}
        options={[
          ["on", tx("on")],
          ["off", tx("off")],
        ]}
        onChange={(v) => update({ autoSpeak: v === "on" })}
      />
      <Choice
        label={tx("pace")}
        value={settings.pace}
        options={[
          ["slow", tx("paceSlow")],
          ["normal", tx("paceNormal")],
        ]}
        onChange={(v) => update({ pace: v as Pace })}
      />
      <Choice
        label={tx("textSize")}
        value={settings.size}
        options={[
          ["normal", tx("sizeNormal")],
          ["large", tx("sizeLarge")],
        ]}
        onChange={(v) => update({ size: v as Size })}
      />

      <p className="text-sm text-muted">
        {tx("disclaimer")}{" "}
        <Link href="/about" className="underline">
          {tx("about")}
        </Link>
      </p>
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <p className="mb-2 font-bold" id={id}>
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="flex gap-2">
        {options.map(([v, text]) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`flex-1 rounded-2xl border-2 px-4 py-2.5 font-semibold ${
              value === v ? "border-accent bg-accent-soft" : "border-line bg-card"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function StyleCards({ value, onPick }: { value: Style | null; onPick: (s: Style) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(["pure", "mix"] as const).map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          aria-pressed={value === s}
          className={`rounded-2xl border-2 bg-card p-4 text-start transition active:scale-[0.98] ${
            value === s ? "border-accent" : "border-line"
          }`}
        >
          <span className="block text-xl font-bold">{t(s, s === "pure" ? "stylePure" : "styleMix")}</span>
          <span className="mt-1 block text-muted">{t(s, s === "pure" ? "stylePureSample" : "styleMixSample")}</span>
        </button>
      ))}
    </div>
  );
}

function Onboarding({ onPick }: { onPick: (s: Style) => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <AriaAvatar size={88} />
        <h1 className="mt-4 text-3xl font-bold">నమస్కారం! నేను ఆరియా.</h1>
        <p className="mt-1 text-lg text-muted">Hi! I&apos;m Aria.</p>
        <p className="mt-6 text-xl font-bold">నేను మీతో ఎలా మాట్లాడాలి?</p>
        <p className="mb-5 text-muted">How should I talk to you?</p>
      </div>
      <StyleCards value={null} onPick={onPick} />
      <p className="mt-4 text-center text-sm text-muted">{t("pure", "styleChangeLater")}</p>
    </main>
  );
}
