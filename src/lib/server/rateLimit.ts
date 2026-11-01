
// Simple per-IP, per-route rate limit kept in memory.
// On Vercel each server instance has its own memory, so this is a soft guard
// against one person burning through credits, not a hard global limit.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimited(req: Request, route: string, limitPerMinute: number): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const key = `${route}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
    }
    return false;
  }
  bucket.count += 1;
  return bucket.count > limitPerMinute;
}

export function tooManyRequests(): Response {
  return Response.json({ error: "rate_limited" }, { status: 429 });
}
