/**
 * Pull waif's corrections into `waif-feedback.md`, the one file the loop is
 * read from.
 *
 * The rows live in stuffboard's table because a public page must not hold a
 * database credential. That makes them invisible: nobody opens a database to
 * ask whether a gloss is wrong. So they come here, into a file that is in the
 * repo, next to the words they are about, and that a diff will show changing.
 *
 * Only the block between the markers is generated. Everything above it is
 * written by hand and is the actual point of the file — what was changed, and
 * what the corrections said that made it worth changing.
 *
 *   WAIF_FEEDBACK_SECRET=... node scripts/pull-feedback.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const URL_ = process.env.WAIF_FEEDBACK_URL ?? "https://stuffs.bid/api/waif-feedback";
const SECRET = (process.env.WAIF_FEEDBACK_SECRET ?? "").replace(/\s+/g, "");
const FILE = new URL("../../waif-feedback.md", import.meta.url);
const START = "<!-- pulled:start -->";
const END = "<!-- pulled:end -->";

if (!SECRET) {
  console.error("WAIF_FEEDBACK_SECRET is not set. Nothing was written.");
  process.exit(1);
}

const res = await fetch(URL_, { headers: { "x-waif-secret": SECRET } });
if (!res.ok) {
  console.error(`Read failed: HTTP ${res.status}. Nothing was written.`);
  process.exit(1);
}
const d = await res.json();

const rank = (obj, empty) => {
  const rows = Object.entries(obj ?? {});
  if (!rows.length) return `*${empty}*\n`;
  return ["| Count | |", "|---|---|", ...rows.map(([k, n]) => `| ${n} | ${k} |`)].join("\n") + "\n";
};

const pct = (v) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`);

const rows = (d.rows ?? []).map((r) => {
  const shown = r.shade2 ? `${r.shade} + ${r.shade2}` : r.shade;
  const said = r.fits ? "fits" : [r.trueShade, r.trueIntent].filter(Boolean).join(", ") || "wrong, no word given";
  return `| ${r.createdAt.slice(0, 10)} | ${r.family} | ${shown} | ${r.shadeConf.toFixed(2)} | ${r.intent} | ${r.chars} | ${said} |`;
});

const block = `${START}
*Pulled ${new Date().toISOString().slice(0, 10)} from \`${URL_}\`. Do not hand-edit
below this line — run \`npm run feedback\` instead.*

| | |
|---|---|
| Readings rated | **${d.total}** |
| Accepted | **${d.fits}** (${pct(d.acceptRate)}) |
| Readings that named two words | **${d.paired ?? 0}** (accepted ${pct(d.pairedAcceptRate)}) |

### What the reading was corrected to

${rank(d.corrections, "No corrections yet.")}
### Words people reached for that are not in the sixty-two

These arrive with a word and no family. A gloss cannot be rewritten to fix one
— it means the vocabulary is missing something.

${rank(d.offVocabulary, "None yet.")}
### Every row

${rows.length ? ["| Date | Family | Named | Conf | Intent | Chars | They said |", "|---|---|---|---|---|---|---|", ...rows].join("\n") : "*No rows yet.*"}
${END}`;

const file = readFileSync(FILE, "utf8");
const a = file.indexOf(START);
const b = file.indexOf(END);
if (a === -1 || b === -1) {
  console.error(`Markers not found in ${FILE.pathname}. Nothing was written.`);
  process.exit(1);
}
writeFileSync(FILE, file.slice(0, a) + block + file.slice(b + END.length));
console.log(`waif-feedback.md updated — ${d.total} rows, ${pct(d.acceptRate)} accepted, ${Object.keys(d.corrections ?? {}).length} distinct corrections.`);
