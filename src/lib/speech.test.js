import { describe, it, expect } from "vitest";
import { parseCommand } from "./speech";

const cases = [
  // control
  ["hold on", { type: "pause" }],
  ["wait", { type: "pause" }],
  ["keep going", { type: "resume" }],
  ["what was that", { type: "repeat" }],
  ["skip", { type: "skip" }],
  ["not this one", { type: "skip" }],
  // a longer hold: both phrasings the session screen documents
  ["hold for another twenty", { type: "extend", seconds: 20 }],
  ["give me ten more seconds", { type: "extend", seconds: 10 }],
  // relative adjustments
  ["two more", { type: "adjust", delta: 2 }],
  ["three fewer", { type: "adjust", delta: -3 }],
  ["two short", { type: "adjust", delta: -2 }],
  ["a couple more", { type: "adjust", delta: 2 }],
  ["I couldn't do the last two", { type: "adjust", delta: -2 }],
  // a stated total is a count, not a shortfall (TODO-2-stated-count)
  ["I only did eight", { type: "count", value: 8 }],
  ["only got 9", { type: "count", value: 9 }],
  ["stopped at ten", { type: "count", value: 10 }],
  // completion
  ["done", { type: "done" }],
  ["next", { type: "done" }],
  ["done, twelve", { type: "done", value: 12 }],
  // a bare number
  ["twelve", { type: "count", value: 12 }],
  ["15", { type: "count", value: 15 }],
  // noise is ignored rather than guessed at
  ["the dog is barking", null],
];

describe("parseCommand", () => {
  it.each(cases)("%s", (said, expected) => {
    expect(parseCommand(said)).toEqual(expected);
  });
});
