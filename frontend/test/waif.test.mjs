// Unit tests for the reading. No API calls: every fixture in
// waif-fixtures.json is the exact pair of answer objects Jev returned in a
// real probe against jev-1.13.0 on 2026-09-20, so the families, the sentence
// and the gates can all be changed without spending a request to find out
// what broke.

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { interpret } from "../src/lib/waif.ts";

const F = JSON.parse(readFileSync(new URL("./waif-fixtures.json", import.meta.url), "utf8"));
const read = (k) => interpret(F[k].stage1, F[k].shade);
const noul = (v) => ({ type: "noul", noul: v });
const score = (s, confidence, probs) => ({
  type: "score", score: s, confidence,
  probabilities: Object.fromEntries(probs.map((p, i) => [String(i), p])),
});

test("a blocked, negative, keyed-up text is named from the anger family", () => {
  const r = read("blocked");
  assert.equal(r.ok, true);
  assert.equal(r.family.id, "anger");
  assert.equal(r.word, "Frustration");
});

test("the gloss travels with the word, so the word never works alone", () => {
  assert.match(read("blocked").gloss, /Blocked from something/);
});

// What the reader wanted and the first version did not give them.
test("intent finishes the sentence rather than repeating beside it", () => {
  const r = read("askhelp");
  assert.equal(r.intent.id, "asking_for_help");
  assert.match(r.sentence, / — and asking for help\.$/);
  // One description line, so the sentence carries it and the summary does not
  // say it twice.
  assert.equal(r.summary.split("asking for help").length - 1, 1);
});

test("the published ratings ride along as reference, never as the mechanism", () => {
  const r = read("rage");
  assert.equal(r.family.id, "anger");
  // Warriner's mean for the chosen word, whatever that word turned out to be.
  assert.ok(r.norms && r.norms.n > 0 && r.norms.v > 0);
});

test("gibberish is gated before either stage is reported", () => {
  const r = interpret({ is_writing: noul(0.08), family: { choice: "flat", confidence: 0.3 } }, null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "not_writing");
  assert.equal(r.notes.length, 0, "a refusal must not still carry observations");
});

test("a shade that did not separate names the word it sits beside", () => {
  const r = read("flat");
  // Recorded confidence on this one was 0.20 — the feeling is genuinely
  // between two words, and saying so is the point.
  assert.ok(r.shadeConfidence < 0.6);
  assert.ok(r.notes.some((n) => /sits between/.test(n)), r.notes.join(" | "));
});

test("an unsettled family is admitted rather than hidden behind a confident word", () => {
  const r = read("proudkid");
  assert.ok(r.family.confidence < 0.5);
  assert.ok(r.notes.some((n) => /family was unsettled/.test(n)), r.notes.join(" | "));
});

test("an axis that did not settle is named, with the levels it split between", () => {
  const wobbly = { ...F.blocked.stage1, valence: score(1.6, 0.35, [0.1, 0.45, 0.35, 0.1, 0]) };
  const r = interpret(wobbly, F.blocked.shade);
  assert.ok(r.axes.valence.unsure);
  assert.ok(r.notes.some((n) => /Valence did not settle/.test(n)), r.notes.join(" | "));
  assert.ok(/45%/.test(r.notes.join(" ")));
});

// Confidence alone misses this: the distribution is peaked enough to clear the
// threshold while the top two levels are a coin toss.
test("a two-way split is unsettled even when confidence clears the bar", () => {
  const split = { ...F.blocked.stage1, control: score(3.49, 0.72, [0, 0, 0.03, 0.47, 0.5]) };
  const r = interpret(split, F.blocked.shade);
  assert.ok(r.axes.control.unsure);
});

test("the level shown is the tallest bar, not the rounded score", () => {
  const skewed = { ...F.blocked.stage1, control: score(2.4, 0.6, [0.02, 0.12, 0.3, 0.56, 0]) };
  assert.equal(interpret(skewed, F.blocked.shade).axes.control.level, 3);
});

test("the summary is one speakable line carrying word, reading and intent", () => {
  const r = read("blocked");
  assert.ok(r.summary.startsWith("Frustration."));
  assert.ok(r.summary.includes(r.sentence));
});

test("the removed Nouls leave nothing behind in a reading", () => {
  const r = read("blocked");
  assert.equal(r.signals, undefined);
  assert.ok(!r.notes.some((n) => /held back|not happened yet/.test(n)), r.notes.join(" | "));
});
