import { errorResponse, sarvam } from "@/lib/server/sarvam";
import { rateLimited, tooManyRequests } from "@/lib/server/rateLimit";
import { LIMITS, PACES, VOICES, isPace, isVoice } from "@/lib/settings";
import { toSpeakable } from "@/lib/text";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (rateLimited(req, "speak", 90)) return tooManyRequests();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? toSpeakable(body.text) : "";
  if (!text || text.length > LIMITS.speakChars) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const voice = isVoice(body.voice) ? body.voice : "pooja";
  const pace = isPace(body.pace) ? body.pace : "normal";

  try {
    const result = await sarvam().textToSpeech.convert(
      {
        text,
        language_code: "te-IN",
        model: "bulbul:v4-flash",
        speaker: VOICES[voice] as never,
        pace: PACES[pace],
        output_audio_codec: "mp3",
      },
      { abortSignal: req.signal, timeoutInSeconds: 25 },
    );
    const audio = Buffer.concat(result.audios.map((a) => Buffer.from(a, "base64")));
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
