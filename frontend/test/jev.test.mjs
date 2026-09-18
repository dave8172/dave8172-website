// Unit tests for the answer mapping. No API calls: these feed `interpret` the
// exact answer shapes Jev returned in real probes, so the routing can be
// changed without spending anything to find out what broke.

import assert from "node:assert/strict";
import { test } from "node:test";
import { interpret } from "../src/lib/jev.ts";

const score = (s, conf, probs) => ({ type: "score", score: s, confidence: conf, probabilities: probs });
const dist = (...p) => Object.fromEntries(p.map((v, i) => [String(i), v]));

// Every fixture below is a real response recorded against jev-1.13.0.
const CASES = {
  sunrise:   { verdict: score(3.96, 0.97, dist(0, 0, .01, .01, .98)), is_question: { noul: .98 }, knowable: { noul: .97 }, stakes: score(0.04, 1, {}) },
  exam:      { verdict: score(0.17, 0.86, dist(.82, .17, .01, 0, 0)), is_question: { noul: .98 }, knowable: { noul: .36 }, stakes: score(1.90, 1, {}) },
  quit_job:  { verdict: score(1.98, 0.98, dist(0, .02, .98, 0, 0)),   is_question: { noul: .98 }, knowable: { noul: .67 }, stakes: score(2.00, 1, {}) },
  rain:      { verdict: score(1.99, 0.98, dist(0, .01, .98, .01, 0)), is_question: { noul: .98 }, knowable: { noul: .85 }, stakes: score(0.65, 1, {}) },
  rich:      { verdict: score(1.96, 0.97, dist(0, .04, .96, 0, 0)),   is_question: { noul: .97 }, knowable: { noul: .27 }, stakes: score(1.48, 1, {}) },
  gibberish: { verdict: score(1.89, 0.90, dist(.06, .01, .93, 0, 0)), is_question: { noul: .02 }, knowable: { noul: .30 }, stakes: score(0.00, 1, {}) },
};

test("a confident yes lands on the top bucket", () => {
  const r = interpret(CASES.sunrise, "Will the sun rise tomorrow?");
  assert.equal(r.level, 4);
  assert.ok(["It is certain", "It is decidedly so", "Without a doubt", "Yes definitely", "You may rely on it"].includes(r.answer));
});

test("a confident no lands on the bottom bucket", () => {
  const r = interpret(CASES.exam, "Will I pass my exam?");
  assert.equal(r.level, 0);
  assert.equal(r.reason, "verdict");
});

test("gibberish is gated before the verdict is used", () => {
  const r = interpret(CASES.gibberish, "asdkjfh asdf kjh");
  assert.equal(r.reason, "not_a_question");
  assert.equal(r.answer, "Concentrate and ask again");
});

// The distinction the whole middle bucket turns on: both score ~2.0, but only
// one of them is a question nobody could answer.
test("an unknowable middle gets the unknowable phrasings", () => {
  const r = interpret(CASES.rich, "Will I be rich?");
  assert.equal(r.level, 2);
  assert.equal(r.reason, "unknowable");
  assert.ok(["Cannot predict now", "Better not tell you now"].includes(r.answer));
});

test("a knowable middle gets the ordinary hedges, not the unknowable ones", () => {
  const r = interpret(CASES.rain, "Will it rain in Mumbai next Tuesday?");
  assert.equal(r.level, 2);
  assert.equal(r.reason, "verdict");
  assert.ok(!["Cannot predict now", "Better not tell you now"].includes(r.answer));
});

// Confidence must never drive the hazy branch. Measured: "should I quit my
// job" returns confidence 0.98 while sitting squarely on "could go either
// way" — Jev is confidently undecided, so a low-confidence test would have
// fired on exactly the wrong cases.
test("high confidence on the middle level still reads as undecided", () => {
  const r = interpret(CASES.quit_job, "Should I quit my job?");
  assert.equal(r.level, 2);
  assert.ok(r.verdict.confidence > 0.9);
});

// Recorded from production: score 3.18 rounds to 3, but 56% of the mass is on
// level 4. The answer must follow the mass, not the rounded mean.
test("a long tail must not drag the answer off the tallest bar", () => {
  const black = {
    verdict: score(3.18, 0.32, dist(0.02, 0.06, 0.19, 0.16, 0.56)),
    is_question: { noul: 0.98 }, knowable: { noul: 0.95 }, stakes: score(0.01, 1, {}),
  };
  const r = interpret(black, "Is black a color?");
  assert.equal(r.level, 4, "should pick the 56% bucket, not the 16% one");
});

test("the same question always gets the same wording", () => {
  const a = interpret(CASES.sunrise, "Will the sun rise tomorrow?");
  const b = interpret(CASES.sunrise, "  WILL THE SUN RISE TOMORROW?  ");
  assert.equal(a.answer, b.answer);
});

test("every level has at least one phrasing", () => {
  for (let i = 0; i < 5; i++) {
    // Mass actually on the level under test. An all-zero distribution cannot
    // occur — probabilities sum to 1 — and it made the old fixture degenerate.
    const probs = [0, 0, 0, 0, 0];
    probs[i] = 1;
    const r = interpret({ ...CASES.sunrise, verdict: score(i, 1, dist(...probs)) }, "q");
    assert.equal(r.level, i);
    assert.ok(typeof r.answer === "string" && r.answer.length > 0);
  }
});
