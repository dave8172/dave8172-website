# TypeSafe in this repo

The shared `typesafe-ai` skill carries how TypeSafe works. This file carries how
*this site* uses it, per that skill's local convention. Created 2026-09-20,
covering both consumers; the Magic Jev Ball predated the convention.

## Credential

`TYPESAFE_API_KEY`, set as an environment variable on the `dave8172-website`
Vercel project. Sourced from `/root/aiPath/.secrets/typesafe.key`, which is
gitignored and never printed. **The key is read at request time inside the
serverless function**, never at build time, so it cannot be inlined into static
output.

Two handling rules, both learned the hard way on 2026-09-18:

- **Strip all whitespace from the key, not just the ends.** A wrapped paste puts
  a newline in the middle; the Authorization header value is then illegal and
  `fetch` throws *before* any request is sent, so there is no status to read and
  it looks like a network fault.
- **Never log a raw error message from a failed call.** Node's invalid-header
  `TypeError` quotes the offending header value back at you — which is the key.
  `/api/waif` logs only the error's class and an upstream status.

## SDK

None. Raw HTTP `POST https://api.typesafe.ai/v1/systemone`, `model: "jev-latest"`,
`fetch` with a 20s `AbortSignal.timeout`. The site has no runtime dependencies
and this does not add one.

## The judgments

### `/jevball` — `src/lib/jev.ts`

State: `{ question }`. Four questions, one request.

| id | Primitive | Answers |
|---|---|---|
| `verdict` | Score, 5 levels | How likely is the answer to this question to be yes? |
| `stakes` | Score, 3 levels | How much is riding on it for the asker? |
| `is_question` | Noul | Is this a genuine question, not gibberish? |
| `knowable` | Noul | Could the answer be known or predicted at all? |

### `/waif` — `src/lib/waif.ts`

State: `{ text }`. Nine questions, one request.

| id | Primitive | Answers |
|---|---|---|
| `valence` | Score, 5 levels | How pleasant or unpleasant is the feeling? |
| `arousal` | Score, 5 levels | How activated — shut down, or keyed up? |
| `control` | Score, 5 levels | How much say does the writer feel they have? |
| `ahead` | Noul | Is the feeling about something that has not happened yet? |
| `is_writing` | Noul | Is this something a person actually wrote? |
| `mixed` | Noul | Is more than one feeling present at once? |
| `directed` | Noul | Is the feeling aimed at the reader? |
| `asking` | Noul | Is it asking for something, explicitly or not? |
| `restrained` | Noul | Is the feeling being held back relative to what is described? |

**Why axes and not an emotion Choice.** A Choice over emotion words splits its
own vote between synonyms — `annoyed`, `irritated`, `frustrated` are one feeling
in three wordings — and confidence then collapses for a reason that has nothing
to do with the text. The same trap the ball hit with its twenty answers, worse,
because emotion vocabulary is almost all synonyms.

**A control rubric must not contain an emotion word.** Level 1 read *"Overwhelmed:
struggling to keep any grip on it"*, which primed the model with a feeling while
asking about agency, and labelled the meter with a word that is not a point on a
control scale. Renamed 2026-09-20 to *"Little control"*, rubric *"Struggling to keep
any grip on it"*. Every level on an axis has to be a position on that axis.

**Two prototypes were unreachable and one word was missing.** `Excitement` sat at
arousal 3.8 — which this rubric describes as *frantic, furious or overwhelmed* — so
a plainly excited text measuring 3.00 could never reach it, and every future-facing
text was additionally penalised because its `ahead` was parked at 0.75 against
`Anticipation`'s 0.90. Moved to (3.7, 3.2, 3.0, 0.85) and (3.2, 2.2, 2.7, 0.92);
*"i am going to dance with my friends"* went from **Anticipation** to **Excitement**,
with Anticipation the runner-up 0.10 behind. `Longing` was added for wanting
something you do not control: a wistful probe had no word within 1.89.

**Why `ahead` exists.** Three axes underdetermine the name. Frustration and
anxiety sit within a whisker of each other on valence, arousal and control;
what separates them is whether the thing has happened yet. Measured
2026-09-20: without it, a plainly frustrated text read as *Anxiety*; with it,
*Frustration*, and the anxious text still reads as *Dread*.

## Thresholds

Validated on a probe set of 12 texts run against **jev-1.13.0 on 2026-09-20**,
recorded as fixtures in `frontend/test/waif.test.mjs`. Small, so treat every
number here as provisional.

| Constant | Value | Basis |
|---|---|---|
| `IS_WRITING` | 0.50 | Real writing scored 0.96–0.98; keyboard mashing 0.08 |
| `PRESENT` (Nouls) | 0.60 | Separates the signals that fired correctly from near-misses at 0.43–0.49 |
| `SETTLED` (axis confidence) | 0.50 | Below it the weight is genuinely split; an ambiguous text measured 0.35 on valence while clean ones measured 0.76–0.98 |
| `MARGIN` (top two levels) | 0.15 | Confidence is computed over the whole distribution, so a two-way split can clear `SETTLED` and still be a coin toss — one probe landed 52% against 47% on control and was reported flatly |
| `FAR` (distance) | 1.35 | Clean matches landed 0.40–1.00; a text with no good word landed 2.06 |

`jevball`'s own `HIGH_STAKES = 1.5` was set the same way and is recorded in that
file.

## What stayed in code

- **The emotion vocabulary.** 30 words, each at a hand-placed coordinate on the
  three axes plus a time orientation. Opinionated, arguable, and in a table you
  can read — not inside the model, where it could be neither.
- **The nearest-word lookup**, including its weights (valence 1.3, arousal 1.0,
  control 0.7, ahead 0.8) and the "no word is close" threshold.
- **Every sentence.** The model never writes a word of the output.
- **The level shown on a meter is the argmax, not the rounded score** — a skewed
  distribution drags the mean across a boundary and lands the highlight on a bar
  the mass is not in.

## Measured cost

Per reading, `jev-1.13.0`, 2026-09-20: **~1,010 input tokens, ~148 output**.
Input is dominated by the rubrics, which are sent on every call regardless of
how short the text is — so a one-line input costs almost exactly what a
paragraph does. The ball's four questions cost roughly half that.

Rate limit on the account is 1,200 requests/minute against 250,000 tokens/second,
so on calls this small it is *requests* that are scarce and batching every
question into one is the whole optimisation. Both endpoints sit behind an
in-memory spend cap (20 per visitor per day, 500 global), which holds per warm
function instance rather than globally.
