import { SarvamAIClient, SarvamAIError } from "sarvamai";

let client: SarvamAIClient | null = null;

/** One shared Sarvam client. The key is read from the server environment only. */
export function sarvam(): SarvamAIClient {
  if (!client) {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) throw new MissingKeyError();
    client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
  }
  return client;
}

export class MissingKeyError extends Error {
  constructor() {
    super("SARVAM_API_KEY is not set");
  }
}

/** Turn any Sarvam / server error into a small JSON error the browser can show. */
export function errorResponse(err: unknown): Response {
  if (err instanceof MissingKeyError) {
    console.error("SARVAM_API_KEY is missing. Set it in .env.local or in Vercel env vars.");
    return Response.json({ error: "server_config" }, { status: 500 });
  }
  if (err instanceof SarvamAIError) {
    const status = err.statusCode ?? 502;
    console.error("Sarvam API error", status, err.message);
    if (status === 429) return Response.json({ error: "rate_limited" }, { status: 429 });
    if (status === 402) return Response.json({ error: "no_credits" }, { status: 402 });
    return Response.json({ error: "upstream" }, { status: 502 });
  }
  console.error("Unexpected error", err);
  return Response.json({ error: "server" }, { status: 500 });
}
