/**
 * Jev — TypeSafe's System One model. Returns typed judgments and calibrated
 * probabilities instead of text, so the ball's verdict is a real measurement
 * rather than a random draw.
 *
 * Server-only. Nothing here may be imported into a client component: it is
 * reached solely through /api/jev, which holds the key.
 */

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

/**
 * The verdict axis.
 *
 * The twenty classic 8-ball answers are really five buckets of near-synonyms —
 * "It is certain" and "Without a doubt" are the same claim in different words.
 * A Choice over all twenty would smear probability across wordings and collapse
 * confidence for a reason that has nothing to do with the question. A Score on
 * an ordered axis asks the one judgment that has a right answer.
 */
const LEVELS = [
  "Almost certainly not: the situation described actively works against this outcome",
  "Probably not: the balance of what is described leans against this outcome",
  "Genuinely uncertain: it could plausibly go either way, or there is not enough to tell",
  "Probably yes: the balance of what is described leans toward this outcome",
  "Almost certainly yes: the situation described strongly supports this outcome",
];

/** All four ride in one request: Jev evaluates them in parallel. */
const QUESTIONS = {
  verdict: {
    type: "score",
    instructions:
      "Someone is asking the question in `question` and wants a yes-or-no answer. How likely is the answer to be yes?",
    criteria: LEVELS,
  },
  is_question: {
    type: "noul",
    instructions:
      "The text in `question` is a genuine question someone is asking, not gibberish, an empty phrase, or a random string.",
  },
  knowable: {
    type: "noul",
    instructions:
      "The answer to `question` is something that could be known or reasonably predicted, rather than pure chance or unknowable.",
  },
  stakes: {
    type: "score",
    instructions: "How much is riding on the answer to `question` for the person asking?",
    criteria: ["Trivial; idle curiosity", "Mildly consequential", "Genuinely important to their life"],
  },
} as const;

const ANSWERS: string[][] = [
  ["Don't count on it", "My reply is no", "My sources say no"],
  ["Outlook not so good", "Very doubtful"],
  ["Reply hazy, try again", "Ask again later", "Concentrate and ask again"],
  ["As I see it, yes", "Most likely", "Outlook good", "Yes", "Signs point to yes"],
  ["It is certain", "It is decidedly so", "Without a doubt", "Yes definitely", "You may rely on it"],
];

/** Reserved for the middle level when the question is genuinely unanswerable. */
const UNKNOWABLE = ["Cannot predict now", "Better not tell you now"];

export interface Verdict {
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface BallAnswer {
  answer: string;
  level: number;
  reason: "verdict" | "unknowable" | "not_a_question";
  verdict: Verdict;
  signals: { isQuestion: number; knowable: number; stakes: number };
}

/** Stable per-question wording: asking the same thing twice gives the same answer. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function interpret(answers: any, question: string): BallAnswer {
  const verdict: Verdict = answers.verdict;
  const isQuestion: number = answers.is_question.noul;
  const knowable: number = answers.knowable.noul;
  const stakes: number = answers.stakes.score;
  const seed = hash(question.trim().toLowerCase());
  const signals = { isQuestion, knowable, stakes };

  // Gibberish gate. Measured on jev-1.13.0: a random string scores 0.02 here
  // while every real question tested scored 0.97+.
  if (isQuestion < 0.5) {
    return { answer: "Concentrate and ask again", level: 2, reason: "not_a_question", verdict, signals };
  }

  const level = Math.max(0, Math.min(4, Math.round(verdict.score)));

  // The middle level splits in two. "Will I be rich?" (knowable 0.27) is not a
  // question anyone could answer; "will it rain Tuesday?" (0.85) is predictable
  // in principle and merely uncertain. They deserve different phrasings.
  const unknowable = level === 2 && knowable < 0.4;
  const pool = unknowable ? UNKNOWABLE : ANSWERS[level];

  return {
    answer: pool[seed % pool.length],
    level,
    reason: unknowable ? "unknowable" : "verdict",
    verdict,
    signals,
  };
}

export async function askJev(question: string, apiKey: string): Promise<BallAnswer> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "jev-latest", state: { question }, questions: QUESTIONS }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const err = new Error(`jev ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`) as Error & {
      upstream?: number;
    };
    // The status alone is not a secret and is the whole diagnosis: 401 is a bad
    // key, 429 a rate limit, 400 a malformed request. The body is not exposed.
    err.upstream = res.status;
    throw err;
  }
  const body = await res.json();
  return interpret(body.answers, question);
}
