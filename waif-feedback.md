# waif — what the corrections said

The one file the feedback loop is read from. Every reading on `/waif` asks
*"Does that fit?"*; the answer, and the word the person would have used
instead, lands in stuffboard's `waif_feedback` table and is pulled down here.

```bash
cd frontend && WAIF_FEEDBACK_SECRET="$(tr -d '[:space:]' < /root/aiPath/.secrets/waif-feedback.secret)" npm run feedback
```

**It trains nothing.** Jev is hosted and has no fine-tuning surface, so no row
here changes a weight anywhere. What accumulates is a *labelled eval set over
real inputs*, and the loop that makes the system better is a human one:

> read the corrections → find the gloss they are arguing with → rewrite it →
> re-run the probe set → record it below.

That last step is why this file is not just a dump. The table at the bottom is
pulled; **the log above it is written by hand**, and it is the part that makes
the loop a loop rather than a collection.

## How to read a correction

Three shapes, and they point at three different fixes.

| What arrived | What it means | What to change |
|---|---|---|
| One word shown, corrected to another **in the same family** | The gloss separating those two words is not doing its job | Rewrite the gloss in `vad.ts` |
| One word shown, corrected to one in **another family** | The family Choice went wrong, and the shade never had a chance | Rewrite the family gloss in `vad.ts`, or the `family` instruction in `waif.ts` |
| **Two words shown** and still corrected | Neither candidate was right, which is worse than a near miss — the reading was in the wrong region | Look at the axes on that row before touching any gloss |
| A word **not in the sixty-two** | The vocabulary is missing something | Consider adding a word, which means finding its Warriner row — not rewording an existing one |

**A single correction is one person's reading of a feeling, and feelings are
not a thing anyone is objectively right about.** Nothing here should move on
one row. The threshold that matters is a *repeated* correction: the same word
corrected the same way several times is a claim about the gloss, not about the
person.

## What has been changed because of it

*Nothing yet — the loop opened on 2026-09-20 and the set is still too small to
act on. First entry goes here, dated, naming the correction count that
justified it and the probe-set score before and after.*

## The rows

<!-- pulled:start -->
*Pulled 2026-09-21 from `https://stuffs.bid/api/waif-feedback`. Do not hand-edit
below this line — run `npm run feedback` instead.*

| | |
|---|---|
| Readings rated | **1** |
| Accepted | **1** (100%) |
| Readings that named two words | **0** (accepted —) |

### What the reading was corrected to

*No corrections yet.*

### Words people reached for that are not in the sixty-two

These arrive with a word and no family. A gloss cannot be rewritten to fix one
— it means the vocabulary is missing something.

*None yet.*

### Every row

| Date | Family | Named | Conf | Intent | Chars | They said |
|---|---|---|---|---|---|---|
| 2026-09-20 | looking_ahead | curiosity | 0.92 | reflecting | 103 | fits |
<!-- pulled:end -->
