/**
 * The vocabulary, with published human ratings.
 *
 * GENERATED — do not hand-edit. Every `v`, `a`, `d`, `n` and `sd` below is a
 * mean rating taken from:
 *
 *   Warriner, A.B., Kuperman, V. & Brysbaert, M. (2013).
 *   Norms of valence, arousal, and dominance for 13,915 English lemmas.
 *   Behavior Research Methods 45, 1191-1207.  doi:10.3758/s13428-012-0314-x
 *
 * This is a 62-word extract of that table, kept so the page can show where
 * each word actually sits rather than where somebody guessed it does. `v`, `a`
 * and `d` are means on the 1-9 scales the study used, `n` is how many people
 * rated that word and `sd` is the spread of their valence ratings - which is
 * large, and is shown on the page for that reason.
 *
 * What the numbers are NOT used for: picking the word. That was measured and
 * it does not work - see `waif.ts`. They are reference, and they anchor the
 * rubric levels.
 *
 * The families are a basic-emotion grouping, not part of the cited data.
 */

export interface Shade {
  /** The word shown to the reader. */
  word: string;
  /** What distinguishes it from its neighbours; sent to the model as criteria. */
  gloss: string;
  /** Warriner valence mean, 1-9. */
  v: number;
  /** Warriner arousal mean, 1-9. */
  a: number;
  /** Warriner dominance mean, 1-9. */
  d: number;
  /** Raters. */
  n: number;
  /** Standard deviation of those raters' valence scores, on the same 1-9 scale. */
  sd: number;
}

export interface Family {
  id: string;
  label: string;
  gloss: string;
  shades: Shade[];
}

export const FAMILIES: Family[] = [
  {
    id: "anger",
    label: "Anger",
    gloss: "Something is wrong and someone is at fault",
    shades: [
      { word: "annoyance", gloss: "A small thing, quickly over", v: 2.95, a: 4.10, d: 3.45, n: 20, sd: 1.23 },
      { word: "irritation", gloss: "Grating, repeated, wearing", v: 3.38, a: 5.50, d: 4.35, n: 21, sd: 1.47 },
      { word: "frustration", gloss: "Blocked from something they are trying to do", v: 2.45, a: 5.94, d: 3.27, n: 20, sd: 1.39 },
      { word: "resentment", gloss: "An old grievance still carried", v: 3.00, a: 5.19, d: 4.05, n: 19, sd: 1.89 },
      { word: "anger", gloss: "Squarely angry at someone or something", v: 2.50, a: 5.93, d: 5.14, n: 20, sd: 1.36 },
      { word: "outrage", gloss: "Angry at something that should not be allowed", v: 2.97, a: 6.52, d: 4.80, n: 39, sd: 1.44 },
      { word: "rage", gloss: "Past words; wants to break something", v: 2.50, a: 6.62, d: 4.17, n: 18, sd: 1.95 },
      { word: "hatred", gloss: "Settled, lasting ill will", v: 2.38, a: 5.22, d: 4.00, n: 42, sd: 1.78 },
    ],
  },
  {
    id: "fear",
    label: "Fear",
    gloss: "Something bad may be coming",
    shades: [
      { word: "dread", gloss: "A bad thing is coming and cannot be avoided", v: 3.00, a: 4.50, d: 3.62, n: 19, sd: 1.89 },
      { word: "anxiety", gloss: "Keyed up about something that might go wrong", v: 2.38, a: 4.78, d: 3.39, n: 21, sd: 1.66 },
      { word: "worry", gloss: "Turning a possible bad outcome over and over", v: 2.10, a: 6.33, d: 3.17, n: 21, sd: 1.26 },
      { word: "fear", gloss: "Afraid of something specific and present", v: 2.93, a: 6.14, d: 3.32, n: 42, sd: 1.79 },
      { word: "terror", gloss: "Overwhelmed by fear", v: 2.75, a: 6.35, d: 2.95, n: 20, sd: 1.97 },
      { word: "panic", gloss: "Fear that has taken over action", v: 2.56, a: 6.40, d: 2.65, n: 39, sd: 1.55 },
    ],
  },
  {
    id: "sadness",
    label: "Sadness",
    gloss: "Something is lost or gone wrong and cannot be undone",
    shades: [
      { word: "disappointment", gloss: "Hoped for something and did not get it", v: 2.79, a: 4.90, d: 4.08, n: 19, sd: 1.87 },
      { word: "sadness", gloss: "Plainly sad", v: 2.40, a: 2.81, d: 3.84, n: 20, sd: 1.10 },
      { word: "loneliness", gloss: "Sad at being unaccompanied", v: 2.35, a: 4.09, d: 3.61, n: 43, sd: 1.85 },
      { word: "sorrow", gloss: "Deep, settled sadness", v: 2.95, a: 3.55, d: 3.80, n: 21, sd: 1.72 },
      { word: "grief", gloss: "Sad at a loss that cannot be undone", v: 2.33, a: 4.95, d: 3.26, n: 39, sd: 1.51 },
      { word: "misery", gloss: "Sustained wretchedness", v: 2.20, a: 4.82, d: 3.80, n: 102, sd: 1.59 },
      { word: "despair", gloss: "Sad and out of hope", v: 3.61, a: 4.64, d: 4.05, n: 23, sd: 2.08 },
    ],
  },
  {
    id: "shame",
    label: "Shame",
    gloss: "The fault is their own",
    shades: [
      { word: "regret", gloss: "Wishes they had done otherwise", v: 3.41, a: 4.90, d: 5.63, n: 22, sd: 2.17 },
      { word: "guilt", gloss: "Did something wrong to someone", v: 2.29, a: 4.48, d: 4.35, n: 21, sd: 1.35 },
      { word: "embarrassment", gloss: "Exposed in front of others, socially", v: 2.72, a: 5.45, d: 2.92, n: 18, sd: 1.60 },
      { word: "shame", gloss: "Something wrong with them, not just the act", v: 2.62, a: 5.40, d: 5.21, n: 21, sd: 2.11 },
      { word: "humiliation", gloss: "Degraded by someone else", v: 2.27, a: 5.43, d: 3.26, n: 22, sd: 1.42 },
    ],
  },
  {
    id: "aversion",
    label: "Aversion",
    gloss: "Repelled by something, or resenting what someone else has",
    shades: [
      { word: "envy", gloss: "Wants what someone else has", v: 3.05, a: 4.35, d: 3.16, n: 20, sd: 1.85 },
      { word: "jealousy", gloss: "Afraid of losing something to someone else", v: 2.58, a: 5.45, d: 3.89, n: 106, sd: 1.37 },
      { word: "disgust", gloss: "Repelled by something", v: 3.32, a: 5.00, d: 4.84, n: 19, sd: 2.40 },
    ],
  },
  {
    id: "joy",
    label: "Joy",
    gloss: "Something good has happened or is happening",
    shades: [
      { word: "amusement", gloss: "Finds it funny", v: 7.00, a: 4.82, d: 6.59, n: 19, sd: 1.56 },
      { word: "pride", gloss: "Pleased with something they or theirs achieved", v: 6.50, a: 5.54, d: 5.83, n: 18, sd: 2.28 },
      { word: "optimism", gloss: "Expects things to go well", v: 7.21, a: 4.95, d: 6.90, n: 39, sd: 2.09 },
      { word: "excitement", gloss: "Keyed-up eagerness", v: 7.62, a: 6.21, d: 6.33, n: 42, sd: 1.38 },
      { word: "delight", gloss: "Sharp, immediate pleasure", v: 8.21, a: 5.02, d: 7.29, n: 19, sd: 0.92 },
      { word: "joy", gloss: "Deep, full happiness", v: 8.21, a: 5.55, d: 7.00, n: 19, sd: 1.18 },
    ],
  },
  {
    id: "affection",
    label: "Affection",
    gloss: "Warmth towards a particular person",
    shades: [
      { word: "sympathy", gloss: "Feels for someone\'s difficulty", v: 6.57, a: 3.08, d: 5.90, n: 21, sd: 2.11 },
      { word: "tenderness", gloss: "Gentle, protective warmth", v: 6.89, a: 3.10, d: 5.08, n: 18, sd: 1.64 },
      { word: "nostalgia", gloss: "Warmth for something past", v: 6.65, a: 4.38, d: 5.36, n: 20, sd: 2.08 },
      { word: "gratitude", gloss: "Thankful to someone for something done", v: 6.67, a: 5.09, d: 6.71, n: 21, sd: 2.15 },
      { word: "compassion", gloss: "Moved to care by someone\'s suffering", v: 7.90, a: 4.50, d: 6.36, n: 21, sd: 1.14 },
      { word: "affection", gloss: "Fond of someone", v: 7.89, a: 5.64, d: 6.60, n: 19, sd: 1.05 },
      { word: "love", gloss: "Loves them", v: 8.00, a: 5.36, d: 5.92, n: 37, sd: 1.39 },
    ],
  },
  {
    id: "calm",
    label: "Calm",
    gloss: "Settled and at ease, or a weight lifted",
    shades: [
      { word: "contentment", gloss: "Satisfied with how things are", v: 6.62, a: 4.60, d: 6.58, n: 21, sd: 2.27 },
      { word: "satisfaction", gloss: "Pleased a thing is done or right", v: 7.18, a: 3.18, d: 6.44, n: 22, sd: 1.87 },
      { word: "relief", gloss: "A weight has just lifted", v: 6.63, a: 4.42, d: 5.64, n: 19, sd: 1.54 },
      { word: "confidence", gloss: "Sure of themselves", v: 6.71, a: 4.04, d: 6.50, n: 21, sd: 1.76 },
      { word: "peace", gloss: "Untroubled", v: 7.75, a: 4.65, d: 7.17, n: 40, sd: 1.50 },
      { word: "serenity", gloss: "Deeply still", v: 7.75, a: 2.95, d: 5.97, n: 20, sd: 1.65 },
      { word: "calm", gloss: "Not agitated", v: 6.89, a: 1.67, d: 7.44, n: 18, sd: 2.00 },
    ],
  },
  {
    id: "flat",
    label: "Flat",
    gloss: "No feeling has much hold",
    shades: [
      { word: "indifference", gloss: "Does not care either way", v: 4.35, a: 3.61, d: 5.64, n: 20, sd: 1.73 },
      { word: "apathy", gloss: "Cannot summon caring", v: 3.68, a: 3.80, d: 5.15, n: 19, sd: 1.70 },
      { word: "boredom", gloss: "Nothing here holds interest", v: 2.77, a: 2.58, d: 5.04, n: 22, sd: 1.69 },
      { word: "emptiness", gloss: "Feels hollowed out", v: 3.26, a: 3.18, d: 4.10, n: 23, sd: 2.28 },
      { word: "fatigue", gloss: "Worn down", v: 3.64, a: 3.26, d: 4.05, n: 22, sd: 1.87 },
      { word: "exhaustion", gloss: "Nothing left at all", v: 3.21, a: 4.52, d: 4.29, n: 19, sd: 2.18 },
    ],
  },
  {
    id: "looking_ahead",
    label: "Looking ahead",
    gloss: "Turned towards something not yet here",
    shades: [
      { word: "anticipation", gloss: "Waiting for something coming", v: 5.26, a: 5.39, d: 5.53, n: 19, sd: 1.66 },
      { word: "curiosity", gloss: "Wants to find out", v: 6.37, a: 5.90, d: 6.21, n: 19, sd: 1.42 },
      { word: "desire", gloss: "Wants something", v: 7.05, a: 6.20, d: 6.07, n: 19, sd: 1.75 },
      { word: "hope", gloss: "Wants it and it might happen", v: 7.48, a: 5.29, d: 6.78, n: 21, sd: 1.69 },
      { word: "determination", gloss: "Has decided and will see it through", v: 7.58, a: 5.52, d: 7.06, n: 19, sd: 1.35 },
    ],
  },
  {
    id: "startled",
    label: "Startled",
    gloss: "Caught off guard by something unexpected",
    shades: [
      { word: "surprise", gloss: "Caught off guard", v: 7.44, a: 6.57, d: 5.17, n: 18, sd: 1.58 },
      { word: "awe", gloss: "Struck by something larger than them", v: 6.85, a: 3.83, d: 5.85, n: 20, sd: 1.79 },
    ],
  },
];

export const FAMILY_IDS = FAMILIES.map((f) => f.id);
export const ALL_SHADES = FAMILIES.flatMap((f) => f.shades);

/** The citation, in one place, so the page and the file cannot disagree. */
export const SOURCE = {
  cite: "Warriner, Kuperman & Brysbaert (2013), Norms of valence, arousal, and dominance for 13,915 English lemmas, Behavior Research Methods 45, 1191-1207",
  doi: "https://doi.org/10.3758/s13428-012-0314-x",
  words: 13915,
};
