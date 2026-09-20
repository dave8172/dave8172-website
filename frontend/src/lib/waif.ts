/**
 * waif — What Am I Feeling.
 *
 * Text in, a reading of the feeling behind it out. Jev supplies the
 * measurements; this file turns them into a word.
 *
 * The split is the same one the Magic Jev Ball makes, for the same reason:
 * the model answers questions that have an answer, and code owns every
 * decision that is really a matter of wording. Here that split is load
 * bearing, because "what emotion is this" has no single right answer —
 * but "how negative is it", "how activated is it" and "how much say does
 * this person have" all do.
 *
 * Server-only. Nothing here may be imported into a client component: it is
 * reached solely through /api/waif, which holds the key.
 */

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

/**
 * Three axes, not a list of emotion names.
 *
 * A Choice over twenty-odd emotion words would split its own vote: `annoyed`,
 * `irritated` and `frustrated` are one feeling in three wordings, and the
 * probability mass divides between them for a reason that has nothing to do
 * with the text. Confidence then collapses on exactly the inputs the model
 * read most clearly. The ball hit this with its twenty answers; the same trap
 * is worse here, because emotion vocabulary is almost entirely synonyms.
 *
 * So the model is asked the three questions that psychology has treated as
 * separable since Wundt — pleasantness, activation and a sense of agency —
 * and the *name* is looked up from the coordinates, in code, below. Each axis
 * is measured independently and none of them is a synonym for another.
 *
 * `levels` are the rubric sent to Jev and must stand on their own. `short` is
 * the display legend, which has to fit in a meter cell.
 */
export const AXES = {
  valence: {
    label: "Valence",
    question: "How pleasant or unpleasant is the feeling behind `text`?",
    ends: ["unpleasant", "pleasant"],
    short: ["Heavily negative", "Negative", "Level or mixed", "Positive", "Strongly positive"],
    levels: [
      "Heavily negative: pain, dread, anger or misery runs through the whole of it",
      "Negative: irritation, unease, disappointment or low spirits",
      "Level or mixed: flat and factual, or pulling both ways at once",
      "Positive: warmth, ease, or quiet satisfaction",
      "Strongly positive: delight, love, relief or elation",
    ],
  },
  arousal: {
    label: "Arousal",
    question: "How activated is the person writing `text` — shut down and still, or keyed up?",
    ends: ["shut down", "at full pitch"],
    short: ["Shut down", "Subdued", "Steady", "Keyed up", "At full pitch"],
    levels: [
      "Shut down: flat and drained, nothing moving at all",
      "Subdued: quiet and slow, energy clearly low",
      "Steady: ordinary and level, neither stirred nor unusually still",
      "Keyed up: tense or animated, energy clearly raised",
      "At full pitch: frantic, furious or overwhelmed, and hard to contain",
    ],
  },
  control: {
    label: "Control",
    question: "How much say does the person writing `text` feel they have over what is happening?",
    ends: ["powerless", "in charge"],
    short: ["Powerless", "Little control", "Some say in it", "Steady grip", "In charge"],
    levels: [
      "Powerless: carried along by events with no options left",
      "Struggling to keep any grip on it",
      "Some say in it, but not much",
      "A steady grip on the situation",
      "Fully in charge, deciding what happens next",
    ],
  },
} as const;

export type AxisId = keyof typeof AXES;
export const AXIS_IDS = ["valence", "arousal", "control"] as const;

/**
 * Four qualities that are *present or not*, independently of the axes.
 *
 * These are Nouls rather than another Score because they do not sit on a
 * dimension — text either aims its feeling at a reader or it does not. They
 * are also not mutually exclusive, which is precisely the case the docs say
 * to give one Noul each rather than a Choice.
 *
 * They never change the word. They change the sentence around it, which is
 * where the things a three-axis coordinate cannot hold actually live.
 */
const SIGNALS = {
  mixed: {
    instructions:
      "More than one distinct feeling is present in `text` at the same time, rather than a single one.",
    criteria: {
      true: "Two or more feelings are genuinely running together — relief and grief, anger and affection",
      false: "One feeling, however strong or faint",
    },
    note: "More than one feeling is in here at once.",
  },
  directed: {
    instructions:
      "The feeling in `text` is aimed at whoever will read it, rather than described about a situation or a third party.",
    criteria: {
      true: "Addressed at the reader — accusing, appealing, thanking, confiding",
      false: "Describing a feeling about something or someone else",
    },
    note: "It is aimed at whoever reads it.",
  },
  asking: {
    instructions:
      "`text` is asking for something — help, an answer, agreement or attention — explicitly or by implication.",
    criteria: {
      true: "A request is being made, even if it is never phrased as one",
      false: "Nothing is being asked for",
    },
    note: "It is asking for something, even where it never says so.",
  },
  restrained: {
    instructions:
      "The feeling in `text` is being held back or understated relative to what is actually being described.",
    criteria: {
      true: "The events described are far heavier than the way they are told",
      false: "The telling matches the weight of what happened",
    },
    note: "And it is being held back — what is described is heavier than how it is said.",
  },
} as const;

export type SignalId = keyof typeof SIGNALS;
const SIGNAL_IDS = ["mixed", "directed", "asking", "restrained"] as const;

/** A Noul at or above this reads as *present* for the purpose of the sentence. */
const PRESENT = 0.6;

/** Below this, nothing was said that could be read at all. */
const IS_WRITING = 0.5;

/**
 * Below this, an axis did not settle and must not be stated as if it had.
 *
 * Confidence on a Score is how peaked the distribution is, so a low number
 * means the weight is genuinely spread across levels rather than that the
 * model is being modest. Reporting the tallest bar of a flat distribution in
 * the same voice as the tallest bar of a sharp one is the single easiest way
 * for this page to lie, and it is the failure the meters alone do not prevent:
 * a reader looks at the word, not the bars.
 */
const SETTLED = 0.5;

/**
 * A second, blunter test for the same thing.
 *
 * Confidence is computed from the whole distribution, so a two-way split can
 * still score above `SETTLED` while the top two levels are a coin toss — one
 * probe landed 52% against 47% on control and the page said "In charge" in the
 * same voice it uses at 98%. The margin between first and second is the part a
 * reader would care about, so it gets its own threshold.
 */
const MARGIN = 0.15;

/**
 * Eight questions in one request. They are independent — none needs another's
 * answer — so they ride together and Jev evaluates them in parallel. On calls
 * this small it is requests that are scarce, never tokens.
 */
export const QUESTIONS = {
  ahead: {
    type: "noul",
    instructions:
      "The feeling in `text` is about something that has not happened yet, rather than about something that already has or is happening now.",
    criteria: {
      true: "Directed at what might come — a threat, a hope, an outcome still open",
      false: "Directed at what has already happened or is happening now",
    },
  },
  is_writing: {
    type: "noul",
    instructions:
      "`text` is something a person actually wrote — a message, a note, a thought — rather than gibberish, a random string, or a meaningless fragment.",
  },
  ...Object.fromEntries(
    AXIS_IDS.map((id) => [
      id,
      { type: "score", instructions: AXES[id].question, criteria: [...AXES[id].levels] },
    ]),
  ),
  ...Object.fromEntries(
    SIGNAL_IDS.map((id) => [
      id,
      { type: "noul", instructions: SIGNALS[id].instructions, criteria: SIGNALS[id].criteria },
    ]),
  ),
} as const;

/**
 * The names, each placed at its prototype on the three axes.
 *
 * This table is the opinionated part and it is deliberately in code, where it
 * can be argued with, rather than inside the model where it cannot. Nothing
 * about it is learned: the coordinates are where a reasonable person would put
 * each word, and changing one changes the output in a way you can predict by
 * reading it.
 *
 * Known limit, stated because it is real: three axes cannot separate feelings
 * that differ only by what caused them. Gratitude and contentment sit almost
 * on top of each other here, and nothing in a coordinate can tell them apart —
 * only the cause can, which is not on any axis. Where the nearest word is far
 * from the point, the page says so instead of pretending.
 */
export const WORDS: [string, number, number, number, number][] = [
  ["Despair", 0.2, 0.8, 0.2, 0.5],
  ["Grief", 0.4, 1.4, 0.6, 0.1],
  ["Fear", 0.5, 3.6, 0.5, 0.9],
  ["Anger", 0.6, 3.7, 2.2, 0.15],
  ["Dread", 0.7, 2.6, 0.6, 0.95],
  ["Shame", 0.8, 2.1, 0.7, 0.15],
  ["Anxiety", 1.0, 3.3, 0.8, 0.9],
  ["Frustration", 1.0, 3.0, 1.1, 0.2],
  ["Sadness", 1.0, 1.1, 1.1, 0.15],
  ["Loneliness", 1.0, 1.3, 0.9, 0.2],
  ["Resentment", 1.1, 2.0, 1.8, 0.15],
  ["Weariness", 1.3, 0.6, 1.4, 0.2],
  ["Disappointment", 1.4, 1.6, 1.8, 0.1],
  ["Numbness", 1.5, 0.2, 1.2, 0.2],
  ["Confusion", 1.7, 2.2, 1.0, 0.35],
  ["Longing", 2.1, 1.9, 0.9, 0.85],
  ["Boredom", 1.8, 0.5, 2.0, 0.3],
  ["Even", 2.0, 1.8, 2.5, 0.4],
  ["Surprise", 2.5, 3.4, 1.4, 0.05],
  ["Determination", 2.7, 3.0, 3.6, 0.8],
  ["Calm", 2.9, 1.0, 3.0, 0.4],
  ["Relief", 3.2, 1.7, 1.4, 0.1],
  ["Hope", 3.0, 2.5, 2.1, 0.95],
  ["Contentment", 3.2, 1.4, 3.1, 0.3],
  ["Gratitude", 3.4, 1.9, 2.2, 0.1],
  ["Anticipation", 3.2, 2.2, 2.7, 0.92],
  ["Affection", 3.5, 2.4, 2.9, 0.3],
  ["Pride", 3.5, 2.8, 3.7, 0.2],
  ["Joy", 3.8, 3.1, 3.2, 0.2],
  ["Excitement", 3.7, 3.2, 3.0, 0.85],
];

/**
 * Valence moves the word most and control least, so the distance is weighted
 * rather than plain. Two points equally far apart in raw units are not equally
 * far apart in what you would call them: a point that is one level more
 * negative is a different feeling, while one level less in command is usually
 * the same feeling in a worse position.
 */
export const W = { valence: 1.3, arousal: 1.0, control: 0.7, ahead: 0.8 };

/** Past this, the point is not really near any of the words in the table. */
export const FAR = 1.35;

export interface AxisReading {
  /** The probability-weighted position, 0–4. This is the coordinate. */
  score: number;
  /** The tallest bar. This is what the meter highlights. */
  level: number;
  confidence: number;
  probabilities: number[];
  /** The distribution never settled; the level is the tallest of several. */
  unsure: boolean;
}

export interface Reading {
  ok: boolean;
  reason: "read" | "not_writing";
  word: string;
  /** How far the nearest word sat from the measured point, in weighted units. */
  distance: number;
  /** True when no word in the table is close; the word is then an approximation. */
  far: boolean;
  /** Every word in the table, nearest first, so the runner-up is visible. */
  ranked: Ranked[];
  sentence: string;
  notes: string[];
  /** One speakable paragraph: the whole reading in a form that can be read aloud. */
  summary: string;
  axes: Record<AxisId, AxisReading>;
  signals: Record<SignalId, number>;
  /** How much the feeling is about what has not happened yet. */
  ahead: number;
  isWriting: number;
}

/** Probability map -> dense array, so the page never indexes a missing key. */
function bars(probabilities: Record<string, number> | undefined, n: number): number[] {
  return Array.from({ length: n }, (_, i) => probabilities?.[String(i)] ?? 0);
}

export interface Ranked {
  word: string;
  distance: number;
}

function nearest(
  v: number, a: number, c: number, ahead: number,
): { word: string; distance: number; ranked: Ranked[] } {
  // `ahead` arrives as a probability and the axes are 0-4, so it is stretched
  // onto the same ruler before being compared. Mixing the two scales would
  // silently make time orientation count for a quarter of what it should.
  const t = ahead * 4;
  const ranked: Ranked[] = WORDS.map((w) => ({
    word: w[0],
    distance: Math.sqrt(
      W.valence * (v - w[1]) ** 2 +
        W.arousal * (a - w[2]) ** 2 +
        W.control * (c - w[3]) ** 2 +
        W.ahead * (t - w[4] * 4) ** 2,
    ),
  })).sort((x, y) => x.distance - y.distance);
  return { word: ranked[0].word, distance: ranked[0].distance, ranked };
}

/** The sentence is assembled from the levels, so it always agrees with the meters. */
const VALENCE_CLAUSE = ["Heavily negative", "Negative", "Level", "Positive", "Strongly positive"];
const AROUSAL_CLAUSE = ["and shut down", "and subdued", "and steady", "and keyed up", "and at full pitch"];
const CONTROL_CLAUSE = [
  "with no sense of control",
  "with little sense of control",
  "with some say in it",
  "with a steady grip on it",
  "with it firmly in hand",
];

export function interpret(answers: any): Reading {
  const isWriting: number = answers.is_writing?.noul ?? 0;
  const ahead: number = answers.ahead?.noul ?? 0;

  const axes = Object.fromEntries(
    AXIS_IDS.map((id) => {
      const a = answers[id];
      const probabilities = bars(a?.probabilities, AXES[id].levels.length);
      const [top, second] = [...probabilities].sort((x, y) => y - x);
      return [
        id,
        {
          score: a?.score ?? 2,
          // The argmax, not the rounded score. A skewed distribution drags the
          // mean across a boundary and lands the highlight on a bar the mass
          // is not in — the exact bug the ball had.
          level: probabilities.indexOf(Math.max(...probabilities)),
          confidence: a?.confidence ?? 0,
          probabilities,
          unsure: (a?.confidence ?? 0) < SETTLED || top - second < MARGIN,
        },
      ];
    }),
  ) as Record<AxisId, AxisReading>;

  const signals = Object.fromEntries(
    SIGNAL_IDS.map((id) => [id, answers[id]?.noul ?? 0]),
  ) as Record<SignalId, number>;

  // Gibberish gate. Scoring a random string produces three perfectly real
  // numbers about nothing, which is worse than refusing, because the meters
  // make them look considered.
  if (isWriting < IS_WRITING) {
    return {
      ok: false,
      reason: "not_writing",
      word: "—",
      distance: 0,
      far: false,
      ranked: [],
      sentence: "There is nothing here to read.",
      notes: [],
      summary: "That did not read as something a person wrote, so it was not scored.",
      axes,
      signals,
      ahead,
      isWriting,
    };
  }

  // The coordinate is the mean, not the argmax — and this is the one place the
  // two genuinely differ in what they are for. The meter highlights a bucket,
  // so it wants the tallest bar. The lookup places a point in a continuous
  // space, so it wants the weighted position: a reading split evenly between
  // "negative" and "level" really does sit between them, and the nearest word
  // to the midpoint is the honest answer.
  //
  // Its failure case is a split down the middle with nothing between, where
  // the mean lands where no mass is. `mixed` usually catches exactly that
  // case, and confidence is reported per axis, so the spread stays visible
  // rather than being averaged away silently.
  const { word, distance, ranked } = nearest(axes.valence.score, axes.arousal.score, axes.control.score, ahead);

  const sentence =
    `${VALENCE_CLAUSE[axes.valence.level]} ${AROUSAL_CLAUSE[axes.arousal.level]}, ` +
    `${CONTROL_CLAUSE[axes.control.level]}.`;

  // An axis that did not settle gets said out loud, naming the two levels the
  // weight actually sat on. Without this the sentence reads as confident on
  // exactly the inputs the model found hardest.
  const unsure = AXIS_IDS.filter((id) => axes[id].unsure).map((id) => {
    const ranked = axes[id].probabilities
      .map((p, i) => [p, i] as const)
      .sort((x, y) => y[0] - x[0]);
    const [first, second] = ranked;
    return `${AXES[id].label} did not settle — the weight is split between ${AXES[id].short[first[1]].toLowerCase()} (${Math.round(first[0] * 100)}%) and ${AXES[id].short[second[1]].toLowerCase()} (${Math.round(second[0] * 100)}%).`;
  });

  const notes = [
    ...SIGNAL_IDS.filter((id) => signals[id] >= PRESENT).map((id) => SIGNALS[id].note),
    ...unsure,
  ];

  const far = distance > FAR;
  const summary = [
    far ? `Closest to ${word.toLowerCase()}, though not close.` : `${word}.`,
    sentence,
    ...notes,
  ].join(" ");

  return { ok: true, reason: "read", word, distance, far, ranked, sentence, notes, summary, axes, signals, ahead, isWriting };
}

export async function readFeeling(text: string, apiKey: string): Promise<Reading> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, state: { text }, questions: QUESTIONS }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const err = new Error(`waif ${res.status}`) as Error & { upstream?: number };
    err.upstream = res.status;
    throw err;
  }
  const body = await res.json();
  return interpret(body.answers);
}
