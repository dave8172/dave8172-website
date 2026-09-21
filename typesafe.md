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

**Probabilities come back quantized to whole hundredths** (measured 2026-09-21
across 6,796 values, zero exceptions), and a Choice's distribution therefore
does not always sum to exactly 1. Any threshold compared against a sum of them
has to decide explicitly whether the lattice point is in or out — see
`PAIR_MASS`.

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

State: `{ text }`. **One request carrying seventeen questions** — six that
measure the text, and eleven speculative ones that name the shade.

**The measurement — six questions.**

| id | Primitive | Answers |
|---|---|---|
| `valence` | Score, 5 levels | How pleasant or unpleasant is the feeling? |
| `arousal` | Score, 5 levels | How activated — shut down, or keyed up? |
| `control` | Score, 5 levels | How much say does the writer feel they have? |
| `family` | Choice, 11 options | Which family does the feeling belong to? |
| `intent` | Choice, 8 options | What is the writer *doing* — the act, not the feeling? |
| `is_writing` | Noul | Is this something a person actually wrote? |

**Two words, when the shade lands on two.** `interpret` names a pair — stronger
first — when the shade failed `SHADE_CLEAR` *and* the top two clear `PAIR_MASS`
between them. `Reading.words` carries them with a gloss and a probability each
and is what the page renders; **`Reading.word` stays the single strongest word**,
because that is what a feedback correction is filed against and what the signed
judgment row records. Below `PAIR_MASS` the weight is spread over three or more,
so one word is named and the note says it did not settle.

**The shade — eleven questions, same request.** One per family, asked under
`shade_<family>`, each a Choice over that family's 2–8 shades and each stating
its own premise in words: *"The feeling behind `text` belongs to the anger
family. Which shade of it is it exactly?"* Code reads only the one whose family
the `family` Choice picked and discards the other ten.

**Why two Choices instead of one.** A Choice over sixty emotion words splits its
own vote between synonyms — *annoyed*, *irritated*, *frustrated* are one feeling
in three wordings. Families do not have that problem, because anger and fear are
genuinely alternatives; and once the family is fixed, so are its shades, because
the context has ruled out the fifty-four words that were never in the running.

**Why the second Choice is not a second request — measured 2026-09-21, and it
reversed the previous decision.** Until then the shade was a dependent follow-up
call, on the reading that a second request is warranted when the first answer
determines the second question's options. That rule is about *options*, not
about *requests*: the option set is determined, but it is drawn from eleven
known possibilities, so all eleven can be asked up front. On 24 probe texts × 2
rounds against `jev-1.13.0`, the two designs run back to back on each text:

| | Requests | Latency | Input tokens | Cost per 1,000 readings |
|---|---|---|---|---|
| Two sequential requests | 2 | **762ms** mean, 828 p90 | 1,698 | $0.071 |
| One speculative request | 1 | **398ms** mean, 431 p90 | 2,803 | $0.118 |

One request won **46 of 46** head-to-head pairs, named the **same family in
48/48** and the **same shade in 45/48**. All three shade misses were texts under
0.41 confidence — which the page already reports as sitting between two words —
and the sequential design disagreed with *itself* between rounds on one of them.
Stage-one answers were essentially unmoved by the eleven extra questions: mean
axis-score drift 0.022 on a 0–4 scale (max 0.16), mean family-confidence drift
0.016, intent identical 48/48.

**Why it comes out this way, from the vendor's own facts.** Jev *"ingests the
state once and evaluates every question against it in parallel"*, so question
count barely touches latency while a round trip costs a round trip. And Jev
**charges for input only**, at $42/Btok — so the extra 1,105 tokens are
$0.00005 a reading. Requests, not tokens, are the scarce resource at this size
(1,200/min against 250,000 tokens/sec), and this halves the request count.

**What it costs: the gibberish path.** The gate used to save the second request;
now a refusal pays the full 2,794-token request rather than 1,255. At these
prices that is $0.00006 per refusal, and the gate still exists — it stops
meaningless numbers being shown, which was always the bigger reason.

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
| `PAIR_MASS` | 0.80, **inclusive** | Re-measured 2026-09-21 over 46 readings. With the shade unsettled the runner-up carried **≥22%**; with it settled, **≤19%** — so `SHADE_CLEAR` alone already separates a real second word from noise, and `PAIR_MASS` then drops the case where the weight is spread across three rather than two (guilt 46 / regret 26 / shame 20 sums to 0.72 and stays one word). Fires on 5 texts in 23. **The comparison is `>=` and that is not cosmetic:** every probability Jev returns is a whole hundredth (6,796 values checked, zero exceptions), so a top-two sum lands *on* 0.80 rather than near it. The `flat` example on the page does — apathy 0.46 + emptiness 0.34 — and a strict `>` dropped it while the page displayed two numbers summing to 80%. Zero of the 46 probe readings hit the boundary, which is why it survived to production |
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
and what the person said it should have been. Verified 2026-09-21 by running the
whole path against a local receiver and reading what arrived — no `text` field
is present in the payload at any point.

**`shade2` carries the second word when the reading named two** (added
2026-09-21, nullable column, additive migration). Empty string rather than
absent, because it is inside the signed set and a field that can vanish is a
field whose absence cannot be proved. It matters because *"they corrected guilt
to shame"* and *"we offered guilt **and** embarrassment and they still said
shame"* argue for different fixes — the first about one gloss, the second about
the whole region the reading landed in. The read-back reports paired rows and
their accept rate separately, and keys a correction on both words shown.

**A correction may be a word that is not in the sixty-two.** The select carries
*"none of these; let me type it"*, and a typed word is sent with **no family** —
which is exactly how the read-back separates the two lessons. A word with a
family means a gloss needs rewriting. A word without one means the vocabulary is
missing something, and no rewording fixes that; `offVocabulary` ranks those on
their own.

**The judgments are signed on the way out and verified on the way back**
(`src/lib/feedback.ts`, HMAC-SHA256, 16 bytes hex). Without that the browser
could post any row it liked and the set would be worthless the first time
somebody scripted it. Verified in production 2026-09-20: an edited judgment with
a valid token is refused.

**It cannot train Jev**, which is hosted and has no fine-tuning surface. What
accumulates is a labelled eval set over real inputs — an accept rate, and
corrections that point at which `criteria` string is wrong. That is the loop:
read the corrections, rewrite a gloss, re-run the probe set.

**The rows are read from one file: `waif-feedback.md`.** They live in a database
on another deployment, which makes them invisible — nobody opens a database to
ask whether a gloss is wrong. `npm run feedback` (in `frontend/`) pulls them
into a file in this repo, next to the words they are about, where a diff shows
them changing. Only the block between the `pulled:` markers is generated; above
it is the hand-written log of *what was changed because of a correction*, which
is the half that makes it a loop rather than a collection. The file also carries
the rule that a single correction never moves anything — one person's reading of
a feeling is not a fact, and only a repeated correction is a claim about a gloss.

**Testing it needed a way to untest it.** The loop could not be verified end to
end without writing a row, and a probe row left in the eval set corrupts the
eval set. So stuffboard's route grew a `DELETE` restricted to subjects beginning
`test:` — which a real subject, a 24-character hex digest, can never be — and
`GET` excludes them, so a probe cannot move the numbers the loop is read by. The
delete path was proven to work *before* the first probe row was written, and the
three rows written on 2026-09-21 were removed and confirmed gone.

## Measured cost

`jev-1.13.0`. The Magic Jev Ball is one request of four questions. waif is one
request of seventeen: **~2,803 input tokens**, mean **398ms**, measured
2026-09-21 over 48 readings. Before the fan-out it was 1,698 tokens across two
requests at 762ms.

Input is dominated by rubrics and criteria, which are sent on every call
regardless of how short the text is, so a one-line input costs almost exactly
what a paragraph does — and with eleven shade questions aboard, that is more
true than ever. **Output tokens are free**, which is why returning eleven
distributions instead of one (971 tokens against 322) does not appear in the
bill at all.

Rate limit on the account is 1,200 requests/minute against 250,000 tokens/second,
so on calls this small it is *requests* that are scarce. Both endpoints sit behind
an in-memory spend cap (20 per visitor per day, 500 global) which holds per warm
function instance rather than globally — so the real ceiling is higher than 500
across concurrent instances. The hard version is stuffboard's `/api/quota`.
