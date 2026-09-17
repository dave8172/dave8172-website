import type { APIRoute } from "astro";
import { askJev } from "../../lib/jev";

// The one server-rendered route on this site. It exists because the TypeSafe
// key must never reach the browser — read from process.env at request time on
// the Vercel function, so it is not inlined into any build output.
export const prerender = false;

/** Bump on any change to this file, so a response identifies its own build. */
const BUILD = 2;

const PER_SUBJECT_PER_DAY = 20;
const GLOBAL_PER_DAY = 500;
const DAY_MS = 86_400_000;

// Spend cap for a public demo on a paid key. In-memory, so it holds per warm
// function instance rather than globally — enough to stop a single visitor
// hammering it, not a hard ceiling. The hard version is stuffboard's
// /api/quota, which is built for exactly this and keeps database credentials
// out of a public page; wiring it is one line there and one env var here.
const buckets = new Map<string, { used: number; resetAt: number }>();

function spend(key: string, limit: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { used: 1, resetAt: now + DAY_MS });
    return true;
  }
  if (b.used >= limit) return false;
  b.used += 1;
  return true;
}

async function subjectOf(request: Request, clientAddress: string): Promise<string> {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || clientAddress || "unknown";
  // Hashed before use: the visitor's address is never stored or logged raw.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Trimmed: a key pasted into a dashboard env var routinely carries a trailing
  // newline, which makes the Authorization header invalid and reads as a 401
  // that looks nothing like a paste error.
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (!key) return json({ error: "The ball is not plugged in." }, 503);

  let question: string;
  try {
    const body = await request.json();
    question = String(body?.question ?? "").trim();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  if (!question) return json({ error: "Ask something first." }, 400);
  if (question.length > 400) return json({ error: "That question is too long for one shake." }, 400);

  const subject = await subjectOf(request, clientAddress);
  if (!spend(`s:${subject}`, PER_SUBJECT_PER_DAY)) {
    return json({ error: "You have used today's shakes. Come back tomorrow." }, 429);
  }
  if (!spend("global", GLOBAL_PER_DAY)) {
    return json({ error: "The ball is worn out for today. Try again tomorrow." }, 429);
  }

  try {
    return json(await askJev(question, key));
  } catch (err) {
    console.error("[jev]", err instanceof Error ? err.message : err);
    const upstream = (err as { upstream?: number })?.upstream;
    // `v` is a build marker: without it there is no way to tell a stale
    // deployment from a new one that failed differently, which cost a debugging
    // round. `stage` separates "the API answered with an error status" from
    // "the call threw before any status existed" — the two have different fixes
    // and previously looked identical, because an undefined field is dropped
    // from JSON entirely.
    return json({
      error: "The ball clouded over. Try again.",
      v: BUILD,
      stage: upstream ? "upstream" : "threw",
      upstream: upstream ?? null,
      kind: err instanceof Error ? err.constructor.name : typeof err,
    }, 502);
  }
};
