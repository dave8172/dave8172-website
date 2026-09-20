// Unit tests for the reading. No API calls: every fixture below is the exact
// answer object Jev returned in a real probe against jev-1.13.0, so the word
// table, the sentence and the gates can all be changed without spending a
// request to find out what broke.

import assert from "node:assert/strict";
import { test } from "node:test";
import { interpret } from "../src/lib/waif.ts";

const noul = (v) => ({ type: "noul", noul: v });
const score = (s, confidence, probs) => ({
  type: "score",
  score: s,
  confidence,
  probabilities: Object.fromEntries(probs.map((p, i) => [String(i), p])),
});

const CASES = {
  venting: { ahead: noul(0.23), is_writing: noul(0.98), valence: score(0.92, 0.93, [0.08, 0.92, 0, 0, 0]), arousal: score(2.97, 0.98, [0, 0, 0.02, 0.98, 0]), control: score(0.53, 0.55, [0.59, 0.29, 0.12, 0, 0]), mixed: noul(0.77), directed: noul(0.25), asking: noul(0.74), restrained: noul(0.49) },
  flat: { ahead: noul(0.24), is_writing: noul(0.96), valence: score(1.29, 0.76, [0, 0.71, 0.29, 0, 0]), arousal: score(0.14, 0.88, [0.86, 0.13, 0.01, 0, 0]), control: score(0.63, 0.47, [0.68, 0.02, 0.27, 0.02, 0]), mixed: noul(0.27), directed: noul(0.15), asking: noul(0.16), restrained: noul(0.42) },
  relief: { ahead: noul(0.02), is_writing: noul(0.97), valence: score(3.99, 0.99, [0, 0, 0, 0.01, 0.99]), arousal: score(1.81, 0.29, [0.02, 0.45, 0.23, 0.3, 0]), control: score(0.27, 0.77, [0.86, 0.03, 0.1, 0.01, 0]), mixed: noul(0.5), directed: noul(0.19), asking: noul(0.13), restrained: noul(0.69) },
  gibberish: { ahead: noul(0.13), is_writing: noul(0.08), valence: score(1.99, 0.99, [0, 0.01, 0.99, 0, 0]), arousal: score(1.88, 0.55, [0.13, 0.07, 0.62, 0.16, 0.02]), control: score(1.5, 0.32, [0.3, 0.05, 0.54, 0.05, 0.06]), mixed: noul(0.04), directed: noul(0.07), asking: noul(0.04), restrained: noul(0.12) },
};

test("a blocked, negative, keyed-up text reads as frustration", () => {
  const r = interpret(CASES.venting);
  assert.equal(r.ok, true);
  assert.equal(r.word, "Frustration");
  assert.ok(!r.far, "a clean case should not be flagged as far from the table");
});

// The separation the fourth question exists for. These two sit within a
// whisker of each other on valence, arousal and control; only `ahead` tells
// a present obstruction from a threat that has not arrived.
test("the same axes with a future orientation read as anxiety instead", () => {
  const present = interpret(CASES.venting);
  const future = interpret({ ...CASES.venting, ahead: noul(0.95) });
  assert.equal(present.word, "Frustration");
  assert.notEqual(future.word, "Frustration");
});

test("flat and drained is not scored as ordinary sadness", () => {
  const r = interpret(CASES.flat);
  assert.equal(r.word, "Numbness");
  assert.match(r.sentence, /shut down/);
});

test("gibberish is gated before any of it is reported", () => {
  const r = interpret(CASES.gibberish);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "not_writing");
  assert.equal(r.notes.length, 0, "a refusal must not still carry observations");
});

test("a reading far from every word in the table says so rather than guessing", () => {
  const r = interpret(CASES.relief);
  assert.equal(r.word, "Relief");
  // Relief is a real entry and still sits over a unit away, because the axes
  // put it lower on control than the prototype. The summary has to carry that.
  assert.ok(r.distance > 1);
});

test("an axis that did not settle is named, with the levels it split between", () => {
  const wobbly = { ...CASES.venting, valence: score(1.6, 0.35, [0.1, 0.45, 0.35, 0.1, 0]) };
  const r = interpret(wobbly);
  assert.ok(r.axes.valence.unsure);
  assert.ok(r.notes.some((n) => /Valence did not settle/.test(n)), r.notes.join(" | "));
  assert.ok(/45%/.test(r.notes.join(" ")));
});

// Confidence alone misses this: the distribution is peaked enough to score
// above the threshold while the top two levels are a coin toss.
test("a two-way split is unsettled even when confidence clears the bar", () => {
  const split = { ...CASES.venting, control: score(3.49, 0.72, [0, 0, 0.03, 0.47, 0.5]) };
  const r = interpret(split);
  assert.ok(r.axes.control.unsure);
  assert.ok(r.notes.some((n) => /Control did not settle/.test(n)), r.notes.join(" | "));
});

test("a settled axis is never hedged", () => {
  const r = interpret(CASES.venting);
  assert.equal(r.axes.arousal.unsure, false);
  assert.ok(!r.notes.some((n) => /Arousal did not settle/.test(n)));
});

test("the level shown is the tallest bar, not the rounded score", () => {
  // score 2.4 rounds to 2, but 56% of the weight sits on level 3.
  const skewed = { ...CASES.venting, control: score(2.4, 0.6, [0.02, 0.12, 0.3, 0.56, 0]) };
  const r = interpret(skewed);
  assert.equal(r.axes.control.level, 3);
});

test("the summary is one speakable line carrying the word and the reading", () => {
  const r = interpret(CASES.venting);
  assert.ok(r.summary.startsWith("Frustration."));
  assert.ok(r.summary.includes(r.sentence));
});
