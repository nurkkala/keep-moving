import { describe, it, expect } from "vitest";
import { toMeters, fromMeters, formatDistance, describeTarget, describePace } from "./data";

describe("distance conversion", () => {
  it("stores whole meters", () => {
    expect(toMeters(1, "mi")).toBe(1609);
    expect(toMeters(1, "km")).toBe(1000);
    expect(toMeters(0.1, "mi")).toBe(161);
  });

  it("reads back in the user's unit to two places", () => {
    expect(fromMeters(1609, "mi")).toBe(1);
    expect(fromMeters(5000, "km")).toBe(5);
    expect(fromMeters(null, "km")).toBe("");
  });

  it("formats short and long", () => {
    expect(formatDistance(4828, "mi")).toBe("3 mi");
    expect(formatDistance(500, "km")).toBe("0.50 km");
    expect(formatDistance(4828, "mi", { long: true })).toBe("3 miles");
    expect(formatDistance(5000, "km", { long: true })).toBe("5 kilometers");
  });

  it("says one mile, not one miles", () => {
    expect(formatDistance(1609, "mi", { long: true })).toBe("1 mile");
    expect(formatDistance(1000, "km", { long: true })).toBe("1 kilometer");
  });
});

describe("describeTarget", () => {
  it("time, reps and distance, short and long", () => {
    expect(describeTarget({ targetType: "time", targetValue: 45 })).toBe("45s");
    expect(describeTarget({ targetType: "time", targetValue: 45 }, { long: true })).toBe("45 seconds");
    expect(describeTarget({ targetType: "reps", targetValue: 12, sets: 3 })).toBe("12× · 3 sets");
    expect(describeTarget({ targetType: "reps", targetValue: 12, sets: 3 }, { long: true })).toBe(
      "12 reps, 3 sets"
    );
    expect(describeTarget({ targetType: "distance", targetValue: 5000 }, { unit: "km" })).toBe("5 km");
  });

  it("is empty with no value", () => {
    expect(describeTarget({ targetType: "reps", targetValue: null })).toBe("");
  });
});

describe("describePace", () => {
  it("minutes and seconds per unit", () => {
    expect(describePace(1609, 492, "mi")).toBe("8:12 / mi");
    expect(describePace(5000, 1500, "km")).toBe("5:00 / km");
  });

  it("never prints 60 seconds", () => {
    // 539.7 s a mile rounds up to 9:00, not 8:60.
    expect(describePace(1609.344, 539.7, "mi")).toBe("9:00 / mi");
  });

  it("is empty without both numbers", () => {
    expect(describePace(0, 300)).toBe("");
    expect(describePace(1000, 0)).toBe("");
  });
});
