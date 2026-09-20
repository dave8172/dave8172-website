import type { APIRoute } from "astro";
import { judgmentOf, verify } from "../../../lib/feedback";

// Server-rendered: it holds the shared secret and the destination, neither of
// which may be inlined into build output.
export const prerender = false;

const MAX_LABEL = 40;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

async function subjectOf(request: Request, clientAddress: string): Promise<string> {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || clientAddress || "unknown";
  // Hashed here, so the address never leaves this function and the receiving
  // app never sees one either.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const label = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 && v.length <= MAX_LABEL ? v : undefined;

/**
 * A correction on a reading.
 *
 * **The text is never part of this.** The page promises that nothing typed is
 * stored, and a correction does not need it: what a rubric can actually be
 * refitted against is the judgments and the word a person would have used.
 *
 * The judgments arrive back from the browser rather than being held server
 * side, so they come with the signature this endpoint issued with them. An
 * unsigned or edited reading is refused — otherwise the first person to script
 * this would decide what the eval set says.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const secret = (process.env.WAIF_FEEDBACK_SECRET ?? "").replace(/\s+/g, "");
  const url = process.env.WAIF_FEEDBACK_URL ?? "";
  if (!secret || !url) return json({ error: "Feedback is not connected." }, 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  const judgment = judgmentOf(body);
  const token = label(body.token);
  if (!judgment || !token) return json({ error: "Bad request." }, 400);
  if (!(await verify(judgment, token, secret))) {
    return json({ error: "That reading did not come from here." }, 400);
  }
  if (typeof body.fits !== "boolean") return json({ error: "Bad request." }, 400);

  const payload = {
    ...judgment,
    subject: await subjectOf(request, clientAddress),
    fits: body.fits,
    trueFamily: label(body.trueFamily),
    trueShade: label(body.trueShade),
    trueIntent: label(body.trueIntent),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-waif-secret": secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return json({ error: "That did not save. Try again." }, 502);
    return json({ ok: true });
  } catch {
    // Never log the payload or the secret; the status alone is the diagnosis.
    console.error("[waif-feedback] upstream unreachable");
    return json({ error: "That did not save. Try again." }, 502);
  }
};
