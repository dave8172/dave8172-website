import type { APIRoute } from "astro";
import { readFeeling } from "../../lib/waif";
import { sign, type Judgment } from "../../lib/feedback";

// Server-rendered for the same reason /api/jev is: the TypeSafe key is read
// from process.env at request time on the Vercel function, so it is never
// inlined into build output and never reaches a browser.
export const prerender = false;

/** Bump on any change to this file, so a response identifies its own build. */
const BUILD = 1;

const PER_SUBJECT_PER_DAY = 20;
const GLOBAL_PER_DAY = 500;
const DAY_MS = 86_400_000;
const MAX_CHARS = 1200;

// Spend cap for a public demo on a paid key. In-memory, so it holds per warm
// function instance rather than globally — enough to stop one visitor
// hammering it, not a hard ceiling.
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
  // Strip ALL whitespace, not just the ends: a key pasted into a dashboard
  // field can wrap, and an embedded newline makes the Authorization header
  // value illegal, so fetch throws before sending and there is no status to
  // read. API keys contain no whitespace, so removing it is always safe.
  const rawKey = process.env.TYPESAFE_API_KEY ?? "";
  const key = rawKey.replace(/\s+/g, "");
  if (!key) return json({ error: "waif is not plugged in." }, 503);

  let text: string;
  try {
    const body = await request.json();
    text = String(body?.text ?? "").trim();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  if (!text) return json({ error: "Write something first." }, 400);
  if (text.length > MAX_CHARS) {
    return json({ error: `That is longer than ${MAX_CHARS} characters. Trim it down.` }, 400);
  }

  const subject = await subjectOf(request, clientAddress);
  if (!spend(`s:${subject}`, PER_SUBJECT_PER_DAY)) {
    return json({ error: "You have used today's readings. Come back tomorrow." }, 429);
  }
  if (!spend("global", GLOBAL_PER_DAY)) {
    return json({ error: "waif is worn out for today. Try again tomorrow." }, 429);
  }

  try {
    const reading = await readFeeling(text, key);

    // The feedback loop is optional infrastructure: with no secret set there
    // is nowhere to send a correction, so the page is told not to offer one
    // rather than collecting answers it will drop.
    const feedbackSecret = (process.env.WAIF_FEEDBACK_SECRET ?? "").replace(/\s+/g, "");
    const canCollect = Boolean(feedbackSecret && process.env.WAIF_FEEDBACK_URL);
    if (!reading.ok || !canCollect) return json({ ...reading, feedback: false });

    const judgment: Judgment = {
      chars: text.length,
      family: reading.family.id,
      familyConf: reading.family.confidence,
      shade: reading.word.toLowerCase(),
      shadeConf: reading.shadeConfidence,
      intent: reading.intent.id,
      intentConf: reading.intent.confidence,
      valence: reading.axes.valence.score,
      valenceConf: reading.axes.valence.confidence,
      arousal: reading.axes.arousal.score,
      arousalConf: reading.axes.arousal.confidence,
      control: reading.axes.control.score,
      controlConf: reading.axes.control.confidence,
    };
    return json({ ...reading, feedback: true, judgment, token: await sign(judgment, feedbackSecret) });
  } catch (err) {
    // What the visitor typed NEVER reaches a log line. The page promises that
    // nothing is stored, and a log is storage — so the only things recorded
    // here are the error's own class and an upstream status, neither of which
    // can contain the text or the key.
    const upstream = (err as { upstream?: number })?.upstream;
    const kind = err instanceof Error ? err.constructor.name : typeof err;
    console.error("[waif]", kind, upstream ? `upstream ${upstream}` : "threw");

    return json({
      error: "That did not come back. Try again.",
      v: BUILD,
      stage: upstream ? "upstream" : "threw",
      upstream: upstream ?? null,
      kind,
      keyLen: key.length,
      keyHadWhitespace: rawKey !== key,
    }, 502);
  }
};
