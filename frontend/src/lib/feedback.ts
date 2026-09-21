/**
 * Signing for waif's feedback loop.
 *
 * The browser holds the reading and sends it back with the correction, which
 * means without this anyone could post any row they liked and the eval set
 * would be worth nothing the first time somebody scripted it. So the reading's
 * judgments are signed when they are handed out and the signature is required
 * when they come back: the model's half of every row is provably a real
 * reading, and only the human's half is free.
 *
 * Server-only. The secret must never reach a browser.
 */

export interface Judgment {
  chars: number;
  family: string;
  familyConf: number;
  shade: string;
  shadeConf: number;
  /**
   * The second word, when the reading named two. The empty string when it
   * named one — not `undefined`, because this is signed, and a field that can
   * vanish is a field whose absence cannot be proved.
   */
  shade2: string;
  intent: string;
  intentConf: number;
  valence: number;
  valenceConf: number;
  arousal: number;
  arousalConf: number;
  control: number;
  controlConf: number;
}

const FIELDS: (keyof Judgment)[] = [
  "chars", "family", "familyConf", "shade", "shadeConf", "shade2", "intent", "intentConf",
  "valence", "valenceConf", "arousal", "arousalConf", "control", "controlConf",
];

/** The string fields, which are checked as labels rather than as numbers. */
const TEXT_FIELDS: (keyof Judgment)[] = ["family", "shade", "shade2", "intent"];

/**
 * Fixed order, fixed precision. A float formatted one way going out and
 * another coming back produces a signature mismatch that looks like tampering,
 * which is the most confusing possible bug to debug.
 */
function canonical(j: Judgment): string {
  return FIELDS.map((k) => {
    const v = j[k];
    return typeof v === "number" ? (k === "chars" ? String(v) : v.toFixed(4)) : String(v);
  }).join("|");
}

export async function sign(j: Judgment, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical(j)));
  return [...new Uint8Array(mac)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verify(j: Judgment, token: string, secret: string): Promise<boolean> {
  const expected = await sign(j, secret);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

/** Pulls the judgment half out of whatever shape the caller sent. */
export function judgmentOf(src: Record<string, unknown>): Judgment | null {
  const out = {} as Judgment;
  for (const k of FIELDS) {
    const v = src[k];
    if (TEXT_FIELDS.includes(k)) {
      // `shade2` alone may be empty: that is what "one word was named" looks
      // like, and it still has to survive the round trip byte for byte.
      if (typeof v !== "string" || v.length > 40) return null;
      if (!v && k !== "shade2") return null;
      (out[k] as string) = v;
    } else {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
      (out[k] as number) = v;
    }
  }
  return out;
}
