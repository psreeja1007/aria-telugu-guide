import { errorResponse, sarvam } from "@/lib/server/sarvam";
import { rateLimited, tooManyRequests } from "@/lib/server/rateLimit";
import { systemPrompt } from "@/lib/server/prompt";
import { LIMITS, isStyle } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

type InMessage = { role: "user" | "assistant"; content: string };

function parseMessages(raw: unknown): InMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const msgs: InMessage[] = [];
  for (const m of raw.slice(-LIMITS.historyMessages)) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, LIMITS.historyMessageChars);
    if (text) msgs.push({ role, content: text });
  }
  // The conversation must start with the user and end with a new user message.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== "user" || last.content.length > LIMITS.userMessageChars) return null;
  return msgs;
}

export async function POST(req: Request) {
  if (rateLimited(req, "chat", 20)) return tooManyRequests();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const messages = parseMessages(body.messages);
  const style = isStyle(body.style) ? body.style : "mix";
  if (!messages) return Response.json({ error: "bad_request" }, { status: 400 });

  let upstream: AsyncIterable<{ choices?: { delta?: { content?: string | null } }[] }>;
  try {
    upstream = await sarvam().chat.completions(
      {
        model: "sarvam-105b-conversations",
        stream: true,
        temperature: 0.6,
        max_tokens: 900,
        messages: [{ role: "system", content: systemPrompt(style) }, ...messages],
      },
      { abortSignal: req.signal, timeoutInSeconds: 45 },
    );
  } catch (err) {
    return errorResponse(err);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of upstream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        if (!req.signal.aborted) console.error("Chat stream error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
