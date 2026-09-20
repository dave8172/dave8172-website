/**
 * waif — What Am I Feeling.
 *
 * Text in, a reading of the feeling behind it out.
 *
 * Two requests, and the split between them is the whole design. The first
 * measures the text and picks the *family* the feeling belongs to. The second
 * picks the exact shade, choosing only among that family's words — which it
 * can do well precisely because the family is already fixed.
 *
 * This replaced a hand-placed coordinate table on 2026-09-20, and the reason
 * it replaced it is measured rather than argued. See `EVAL` below.
 *
 * Server-only. Nothing here may be imported into a client component: it is
 * reached solely through /api/waif, which holds the key.
 */

import { FAMILIES, SOURCE, type Family, type Shade } from "./vad.ts";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

/**
 * What was tried, and how well each one named the feeling, on the same 24-text
 * probe set scored against a list of acceptable words per text.
 *
 * It is here rather than in a commit message because the page shows it: the
 * claim "this is built on published norms" is only worth making next to the
 * number saying how far the norms actually got.
 */
export const EVAL = [
  { design: "Nearest word in the whole vocabulary, by published valence/arousal/dominance", score: 3 },
  { design: "Nearest word within a family, by rank on the axis that separates that family", score: 9 },
  { design: "Nearest word within a family, by distance in published valence/arousal/dominance", score: 12 },
  { design: "Family chosen by the model, then the shade chosen by the model", score: 22 },
] as const;
export const EVAL_N = 24;

/**
 * Three axes, and each level is anchored to words with published means.
 *
 * The axes themselves are the dimensional tradition — valence and arousal are
 * Russell's circumplex, and the third is the dominance dimension of Mehrabian
 * and Russell's PAD. That is the part with a literature behind it.
 *
 * The *anchors* are what make the rubric non-arbitrary. Rather than a level
 * reading "quite negative", which means whatever the reader wants, each level
 * names words whose valence, arousal and dominance were rated by people, so
 * the scale is pinned to something outside this file. The numbers in brackets
 * are those published means on the 1-9 scale; they are documentation here,
 * because the model is given the words, not the numbers.
 */
export const AXES = {
  valence: {
    label: "Valence",
    question: "How pleasant or unpleasant is the feeling behind `text`?",
    ends: ["unpleasant", "pleasant"],
    short: ["Heavily negative", "Negative", "Level", "Positive", "Strongly positive"],
    anchors: [2.27, 3.14, 5.0, 6.63, 8.21],
    levels: [
      "As unpleasant as misery or grief: pain or despair runs through the whole of it",
      "As unpleasant as sorrow or confusion: low spirits, unease, something gone wrong",
      "Neither pleasant nor unpleasant: flat and factual, or pulling both ways at once",
      "As pleasant as contentment or relief: warmth, ease, something come right",
      "As pleasant as joy or delight: elation, love, the best of news",
    ],
  },
  arousal: {
    label: "Arousal",
    question: "How activated is the person writing `text` — shut down and still, or keyed up?",
    ends: ["shut down", "at full pitch"],
    short: ["Shut down", "Subdued", "Steady", "Keyed up", "At full pitch"],
    anchors: [2.31, 2.7, 4.4, 5.94, 6.51],
    levels: [
      "As still as calm or serenity: nothing moving, settled or drained",
      "As low-energy as boredom or sadness: quiet and slow",
      "As activated as relief or nostalgia: ordinary, neither stirred nor unusually still",
      "As activated as frustration or anger: tense or animated, energy clearly raised",
      "As activated as rage or panic: frantic or overwhelmed, hard to contain",
    ],
  },
  control: {
    label: "Control",
    question: "How much say does the person writing `text` feel they have over what is happening?",
    ends: ["powerless", "in charge"],
    short: ["Powerless", "Little control", "Some say in it", "Steady grip", "In charge"],
    anchors: [2.8, 3.28, 5.24, 6.17, 7.31],
    levels: [
      "As powerless as panic or terror: carried along with no options left",
      "As powerless as anxiety or worry: struggling to keep any grip on it",
      "In between, as with disgust or regret: some say in it, but not much",
      "As in command as confidence or pride: a steady grip on the situation",
      "As in command as calm or peace: fully settled, deciding what happens next",
    ],
  },
} as const;

export type AxisId = keyof typeof AXES;
export const AXIS_IDS = ["valence", "arousal", "control"] as const;

/**
 * What the writer is *doing*, which is not what they are feeling.
 *
 * This is a Choice and not a set of Nouls, and that is the same argument the
 * emotion vocabulary makes in reverse: speech acts are genuinely alternatives
 * to each other, so asking "which one" is the right question. It replaced two
 * Nouls — *is it aimed at the reader* and *is it asking for something* — which
 * were fragments of this judgment rather than judgments of their own.
 */
export const INTENTS = {
  venting: { label: "venting", gloss: "Getting it out. No answer is wanted and none would help" },
  asking_for_help: { label: "asking for help", gloss: "Requesting practical help, an answer, or a favour" },
  seeking_reassurance: { label: "seeking reassurance", gloss: "Asking to be told it is alright, or that they judged it correctly" },
  confronting: { label: "confronting", gloss: "Calling someone out, accusing, or holding them to something" },
  thanking: { label: "thanking", gloss: "Thanking, appreciating, or telling someone they mattered" },
  deciding: { label: "deciding", gloss: "Announcing or working towards a decision they are committing to" },
  reporting: { label: "telling you what happened", gloss: "Stating what happened or what is planned, informationally" },
  reflecting: { label: "thinking it through", gloss: "Thinking aloud, turning something over, working it out on the page" },
} as const;
export type IntentId = keyof typeof INTENTS;

/**
 * The two Nouls that survived a check on whether they were saying anything.
 *
 * Measured over the 24-text probe set: `mixed` — *is more than one feeling
 * present* — came back at or above 0.6 on twenty-one of twenty-four texts,
 * which is not a signal, it is a property of writing. It was cut, and the
 * thing it was reaching for is now read off the shade Choice's own spread: a
 * feeling that sits between two words shows up as a split distribution, which
 * is a better answer to the same question and costs nothing extra.
 *
 * These two both fired on some inputs and not others, and both change what a
 * reader should take from the reading.
 */
const SIGNALS = {
  ahead: {
    instructions:
      "The feeling in `text` is about something that has not happened yet, rather than about something that already has or is happening now.",
    criteria: {
      true: "Directed at what might come — a threat, a hope, an outcome still open",
      false: "Directed at what has already happened or is happening now",
    },
    note: "It is about something that has not happened yet.",
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
const SIGNAL_IDS = ["ahead", "restrained"] as const;

/** A Noul at or above this reads as *present* for the purpose of the sentence. */
const PRESENT = 0.6;
/** Below this, nothing was said that could be read at all. */
const IS_WRITING = 0.5;
/** Below this, an axis did not settle and must not be stated as if it had. */
const SETTLED = 0.5;
/** …nor may it when the top two levels are this close, however peaked. */
const MARGIN = 0.15;
/** Below this, the shade is one of several and the page says which. */
const SHADE_CLEAR = 0.6;
/** Below this, even the family is unsettled. */
const FAMILY_CLEAR = 0.5;

const familyCriteria = () =>
  Object.fromEntries(FAMILIES.map((f) => [f.id, `${f.label}'s family: ${f.gloss}`]));

/** Stage one: measure it, and decide which family the feeling is in. */
export const QUESTIONS = {
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
  family: {
    type: "choice",
    instructions:
      "Which family does the feeling behind `text` belong to? Pick the family, not the exact shade.",
    criteria: familyCriteria(),
  },
  intent: {
    type: "choice",
    instructions:
      "What is the person writing `text` doing with it — what is the act, regardless of how they feel?",
    criteria: Object.fromEntries(
      (Object.keys(INTENTS) as IntentId[]).map((k) => [k, INTENTS[k].gloss]),
    ),
  },
  ...Object.fromEntries(
    SIGNAL_IDS.map((id) => [
      id,
      { type: "noul", instructions: SIGNALS[id].instructions, criteria: SIGNALS[id].criteria },
    ]),
  ),
} as const;

/** Stage two: which shade, given the family stage one chose. */
const shadeQuestion = (family: Family) => ({
  shade: {
    type: "choice",
    instructions: `The feeling behind \`text\` belongs to the ${family.id} family. Which shade of it is it exactly?`,
    criteria: Object.fromEntries(family.shades.map((s) => [s.word, s.gloss])),
  },
});

export interface AxisReading {
  score: number;
  level: number;
  confidence: number;
  probabilities: number[];
  unsure: boolean;
}

export interface Alternative {
  word: string;
  p: number;
}

export interface Reading {
  ok: boolean;
  reason: "read" | "not_writing";
  /** The shade, as shown. */
  word: string;
  /** What that shade means, so the word is never left to do the work alone. */
  gloss: string;
  family: { id: string; label: string; gloss: string; confidence: number };
  /** How cleanly the shade separated from its neighbours. */
  shadeConfidence: number;
  /** The rest of the family, most probable first. */
  alternatives: Alternative[];
  /** The published ratings for the chosen word — reference, never used to pick it. */
  norms: { v: number; a: number; d: number; n: number; sd: number } | null;
  intent: { id: string; label: string; gloss: string; p: number; confidence: number };
  intentAlternatives: Alternative[];
  sentence: string;
  notes: string[];
  /** One speakable paragraph: the whole reading in a form that can be read aloud. */
  summary: string;
  axes: Record<AxisId, AxisReading>;
  signals: Record<SignalId, number>;
  isWriting: number;
}

function bars(probabilities: Record<string, number> | undefined, n: number): number[] {
  return Array.from({ length: n }, (_, i) => probabilities?.[String(i)] ?? 0);
}

const VALENCE_CLAUSE = ["Heavily negative", "Negative", "Level", "Positive", "Strongly positive"];
const AROUSAL_CLAUSE = ["and shut down", "and subdued", "and steady", "and keyed up", "and at full pitch"];
const CONTROL_CLAUSE = [
  "with no sense of control",
  "with little sense of control",
  "with some say in it",
  "with a steady grip on it",
  "with it firmly in hand",
];

const title = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

function readAxes(answers: any): Record<AxisId, AxisReading> {
  return Object.fromEntries(
    AXIS_IDS.map((id) => {
      const a = answers[id];
      const probabilities = bars(a?.probabilities, AXES[id].levels.length);
      const [top, second] = [...probabilities].sort((x, y) => y - x);
      return [
        id,
        {
          score: a?.score ?? 2,
          // The argmax, not the rounded score: a skewed distribution drags the
          // mean across a boundary and lands the highlight on a bar the mass
          // is not in.
          level: probabilities.indexOf(Math.max(...probabilities)),
          confidence: a?.confidence ?? 0,
          probabilities,
          unsure: (a?.confidence ?? 0) < SETTLED || top - second < MARGIN,
        },
      ];
    }),
  ) as Record<AxisId, AxisReading>;
}

const ranked = (probabilities: Record<string, number>): Alternative[] =>
  Object.entries(probabilities ?? {})
    .map(([word, p]) => ({ word, p }))
    .sort((x, y) => y.p - x.p);

export function interpret(stage1: any, shadeAnswer: any | null): Reading {
  const isWriting: number = stage1.is_writing?.noul ?? 0;
  const axes = readAxes(stage1);
  const signals = Object.fromEntries(
    SIGNAL_IDS.map((id) => [id, stage1[id]?.noul ?? 0]),
  ) as Record<SignalId, number>;

  const familyId: string = stage1.family?.choice ?? "";
  const family = FAMILIES.find((f) => f.id === familyId);
  const familyConfidence: number = stage1.family?.confidence ?? 0;

  const intentId: string = stage1.intent?.choice ?? "reporting";
  const intentMeta = INTENTS[intentId as IntentId] ?? INTENTS.reporting;
  const intentProbs = stage1.intent?.probabilities ?? {};

  const blank: Reading = {
    ok: false,
    reason: "not_writing",
    word: "—",
    gloss: "",
    family: { id: "", label: "—", gloss: "", confidence: 0 },
    shadeConfidence: 0,
    alternatives: [],
    norms: null,
    intent: { id: "", label: "—", gloss: "", p: 0, confidence: 0 },
    intentAlternatives: [],
    sentence: "There is nothing here to read.",
    notes: [],
    summary: "That did not read as something a person wrote, so it was not scored.",
    axes,
    signals,
    isWriting,
  };

  // Gibberish gate. Scoring a random string produces perfectly real numbers
  // about nothing, which is worse than refusing, because the meters make them
  // look considered. It also saves the second request.
  if (isWriting < IS_WRITING || !family || !shadeAnswer) return blank;

  const shadeWord: string = shadeAnswer.choice;
  const shade: Shade | undefined = family.shades.find((s) => s.word === shadeWord);
  const shadeConfidence: number = shadeAnswer.confidence ?? 0;
  const alternatives = ranked(shadeAnswer.probabilities).filter((x) => x.word !== shadeWord);

  const sentence =
    `${VALENCE_CLAUSE[axes.valence.level]} ${AROUSAL_CLAUSE[axes.arousal.level]}, ` +
    `${CONTROL_CLAUSE[axes.control.level]}.`;

  const notes: string[] = [];

  // What `mixed` used to ask, answered better: when the shade did not separate,
  // name the word it is sitting next to instead of asserting one of them.
  if (shadeConfidence < SHADE_CLEAR && alternatives[0]) {
    notes.push(
      `It sits between ${shadeWord} and ${alternatives[0].word} — the two came out ` +
        `${Math.round((shadeAnswer.probabilities[shadeWord] ?? 0) * 100)}% and ` +
        `${Math.round(alternatives[0].p * 100)}%.`,
    );
  }
  if (familyConfidence < FAMILY_CLEAR) {
    notes.push(`Even the family was unsettled, so read the word loosely.`);
  }
  for (const id of SIGNAL_IDS) {
    if (signals[id] >= PRESENT) notes.push(SIGNALS[id].note);
  }
  for (const id of AXIS_IDS) {
    if (!axes[id].unsure) continue;
    const order = axes[id].probabilities
      .map((p, i) => [p, i] as const)
      .sort((x, y) => y[0] - x[0]);
    const [first, second] = order;
    notes.push(
      `${AXES[id].label} did not settle — the weight is split between ` +
        `${AXES[id].short[first[1]].toLowerCase()} (${Math.round(first[0] * 100)}%) and ` +
        `${AXES[id].short[second[1]].toLowerCase()} (${Math.round(second[0] * 100)}%).`,
    );
  }

  const intentP: number = intentProbs[intentId] ?? 0;
  const summary = [
    `${title(shadeWord)}.`,
    sentence,
    `What it is doing: ${intentMeta.label}.`,
    ...notes,
  ].join(" ");

  return {
    ok: true,
    reason: "read",
    word: title(shadeWord),
    gloss: shade?.gloss ?? "",
    family: { id: family.id, label: family.label, gloss: family.gloss, confidence: familyConfidence },
    shadeConfidence,
    alternatives,
    norms: shade ? { v: shade.v, a: shade.a, d: shade.d, n: shade.n, sd: shade.sd } : null,
    intent: {
      id: intentId,
      label: intentMeta.label,
      gloss: intentMeta.gloss,
      p: intentP,
      confidence: stage1.intent?.confidence ?? 0,
    },
    intentAlternatives: ranked(intentProbs)
      .filter((x) => x.word !== intentId)
      .slice(0, 2)
      .map((x) => ({ word: INTENTS[x.word as IntentId]?.label ?? x.word, p: x.p })),
    sentence,
    notes,
    summary,
    axes,
    signals,
    isWriting,
  };
}

async function ask(text: string, questions: unknown, apiKey: string): Promise<any> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, state: { text }, questions }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const err = new Error(`waif ${res.status}`) as Error & { upstream?: number };
    err.upstream = res.status;
    throw err;
  }
  return (await res.json()).answers;
}

export async function readFeeling(text: string, apiKey: string): Promise<Reading> {
  const stage1 = await ask(text, QUESTIONS, apiKey);

  // The gate is checked before spending the second request, not after.
  const familyId: string = stage1.family?.choice ?? "";
  const family = FAMILIES.find((f) => f.id === familyId);
  if ((stage1.is_writing?.noul ?? 0) < IS_WRITING || !family) return interpret(stage1, null);

  const stage2 = await ask(text, shadeQuestion(family), apiKey);
  return interpret(stage1, stage2.shade);
}

export { FAMILIES, SOURCE };
