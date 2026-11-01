import { errorResponse, sarvam } from "@/lib/server/sarvam";
import { rateLimited, tooManyRequests } from "@/lib/server/rateLimit";
import { LIMITS, isStyle } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (rateLimited(req, "transcribe", 20)) return tooManyRequests();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0 || audio.size > LIMITS.audioBytes) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const style = isStyle(form.get("style")) ? (form.get("style") as "pure" | "mix") : "mix";
  const type = audio.type.split(";")[0] || "audio/webm";
  const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  const file = new File([await audio.arrayBuffer()], `speech.${ext}`, { type });

  try {
    const result = await sarvam().speechToText.transcribe(
      {
        file,
        model: "saaras:v4",
        language_code: "te-IN",
        // Pure Telugu: everything in Telugu script. Mix: English words stay in English letters.
        mode: style === "pure" ? "transcribe" : "codemix",
      },
      { abortSignal: req.signal, timeoutInSeconds: 25 },
    );
    return Response.json({ text: (result.transcript ?? "").trim() });
  } catch (err) {
    return errorResponse(err);
  }
}
