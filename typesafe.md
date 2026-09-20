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
  `/api/waif` logs only the error's class and an upstream status, and never the
  visitor's text.

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

### `/waif` — `src/lib/waif.ts`, vocabulary in `src/lib/vad.ts`

State: `{ text }`. **Two requests**, and the split between them is the design.

**Stage one — six questions, one request.**

| id | Primitive | Answers |
|---|---|---|
| `valence` | Score, 5 levels | How pleasant or unpleasant is the feeling? |
| `arousal` | Score, 5 levels | How activated — shut down, or keyed up? |
| `control` | Score, 5 levels | How much say does the writer feel they have? |
| `family` | Choice, 11 options | Which family does the feeling belong to? |
| `intent` | Choice, 8 options | What is the writer *doing* — the act, not the feeling? |
| `is_writing` | Noul | Is this something a person actually wrote? |

**Stage two — one question**, asked only if the gate passes: a Choice over the
chosen family's shades alone, 2–8 options depending on the family.

**Why two Choices instead of one.** A Choice over sixty emotion words splits its
own vote between synonyms — *annoyed*, *irritated*, *frustrated* are one feeling
in three wordings. Families do not have that problem, because anger and fear are
genuinely alternatives; and once the family is fixed, so are its shades, because
the context has ruled out the fifty-four words that were never in the running.
This is the one case where a **second request is warranted**: the first answer
determines the second question's options.

**Why `intent` is a Choice and not Nouls.** It replaced `directed` (*is it aimed
at the reader*) and `asking` (*is it asking for something*), which were fragments
of one judgment. Speech acts are alternatives to each other, so "which one" is
the right question — the mirror of why emotion words are not.

**All three descriptive Nouls were cut, and only the gate survives.** `mixed`
(*is more than one feeling present*) went first, on measurement: it returned
≥0.6 on **21 of 24** probe texts, which is a property of writing rather than a
signal — and what it reached for is read off the shade Choice's spread anyway,
since a split distribution *is* "between two feelings". `ahead` and `restrained`
followed on use: each could only ever append one line, neither changed the word,
the sentence or a meter, and a question whose whole effect is an occasional
footnote costs a reader more attention than it returns.

**One description line, not two.** `intent` used to be reported in its own block
beside the axes' sentence, which read as two verdicts about the same text. It now
finishes that sentence — *"Negative and keyed up, with little sense of control —
and asking for help."*

**A control rubric must not contain an emotion word.** Level 1 once read
*"Overwhelmed: struggling to keep any grip on it"*, which primed the model with a
feeling while asking about agency, and labelled the meter with a word that is not
a position on a control scale.

## Where the numbers come from

`src/lib/vad.ts` is **generated**, a 62-word extract of:

> Warriner, A.B., Kuperman, V. & Brysbaert, M. (2013). *Norms of valence, arousal,
> and dominance for 13,915 English lemmas.* Behavior Research Methods 45,
> 1191–1207. doi:10.3758/s13428-012-0314-x

**It is used to anchor the rubric levels and as reference on the page. It does not
pick the word** — that was tried, measured, and rejected on the numbers. On a
24-text probe set scored against acceptable words per text:

| Design | Score |
|---|---|
| Nearest word in the whole vocabulary, by published V/A/D | 3/24 |
| Nearest word within a family, by rank on the separating axis | 9/24 |
| Nearest word within a family, by V/A/D distance | 12/24 |
| Family chosen by the model, then shade chosen by the model | **22/24** |

Three reasons it fails, all measured here rather than assumed: **dominance
correlates with valence at +0.87** across these emotion words, so the third
dimension is nearly redundant; **negative emotions occupy a very small ball** of
that space, so nearest-neighbour is close to arbitrary; and **a word rated in
isolation is not the same measurement as writing read in context** — people rate
the word *gratitude* far more activated than a grateful message reads.

An earlier attempt to fix the scale mismatch by z-scoring both sides against a
probe corpus was worse still, and for an instructive reason: **the corpus was
negative-skewed, so the mapping inherited the skew** and a plainly warm text
landed below the mean and was named from the sad half of the space.

## Thresholds

Validated on 24 probe texts run against **jev-1.13.0 on 2026-09-20**, with five
pairs recorded as fixtures in `frontend/test/waif-fixtures.json`. Small, so treat
every number as provisional.

| Constant | Value | Basis |
|---|---|---|
| `IS_WRITING` | 0.50 | Real writing scored 0.96–0.98; keyboard mashing 0.08 |
| `SETTLED` (axis confidence) | 0.50 | Below it the weight is genuinely split; an ambiguous text measured 0.35 on valence while clean ones measured 0.76–0.98 |
| `MARGIN` (top two levels) | 0.15 | Confidence is computed over the whole distribution, so a two-way split can clear `SETTLED` and still be a coin toss — one probe landed 52% against 47% on control and was reported flatly |
| `SHADE_CLEAR` | 0.60 | Clean readings scored 0.79–1.00; a genuinely between-two-words text scored 0.20 |
| `FAMILY_CLEAR` | 0.50 | Clear families scored 0.88–1.00; the two probe failures scored 0.37 and 0.68 |

## What stayed in code

- **Every sentence.** The model never writes a word of the output.
- **The families**, which are a basic-emotion grouping and not part of the cited
  data, and the gloss on each shade, which is what the Choice is given as criteria.
- **The level shown on a meter is the argmax, not the rounded score** — a skewed
  distribution drags the mean across a boundary and lands the highlight on a bar
  the mass is not in.
- **Every threshold above**, and the decision to refuse rather than score.

## The feedback loop

Every reading offers *"Does that fit?"*, and a correction writes one row to
stuffboard's `waif_feedback` table through `/api/waif/feedback` — which holds
`WAIF_FEEDBACK_SECRET` and `WAIF_FEEDBACK_URL` server-side, so this public page
never touches a database credential. With either unset the reading comes back
`feedback: false` and the page does not offer the ask at all.

**The row is judgments, never text**: the three axis scores and confidences, the
family, shade and intent with theirs, the character count, a pre-hashed subject,
and what the person said it should have been.

**The judgments are signed on the way out and verified on the way back**
(`src/lib/feedback.ts`, HMAC-SHA256, 16 bytes hex). Without that the browser
could post any row it liked and the set would be worthless the first time
somebody scripted it. Verified in production 2026-09-20: an edited judgment with
a valid token is refused.

**It cannot train Jev**, which is hosted and has no fine-tuning surface. What
accumulates is a labelled eval set over real inputs — an accept rate, and
corrections that point at which `criteria` string is wrong. That is the loop:
read the corrections, rewrite a gloss, re-run the probe set.

## Measured cost

`jev-1.13.0`, 2026-09-20. Stage one ~1,250 input tokens; stage two ~444. Input is
dominated by rubrics and criteria, which are sent on every call regardless of how
short the text is, so a one-line input costs almost exactly what a paragraph does.
**A refusal costs one request, not two** — the gate is checked before stage two is
spent.

Rate limit on the account is 1,200 requests/minute against 250,000 tokens/second,
so on calls this small it is *requests* that are scarce. Both endpoints sit behind
an in-memory spend cap (20 per visitor per day, 500 global) which holds per warm
function instance rather than globally — so the real ceiling is higher than 500
across concurrent instances. The hard version is stuffboard's `/api/quota`.
