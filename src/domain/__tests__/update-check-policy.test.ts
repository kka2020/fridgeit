import { FOREGROUND_CHECK_INTERVAL_MS, shouldCheckForUpdate } from "@/domain/update-check-policy";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const T = new Date("2026-11-07T09:00:00Z");

function at(offsetMs: number): Date {
  return new Date(T.getTime() + offsetMs);
}

describe("FOREGROUND_CHECK_INTERVAL_MS", () => {
  it("is 15 minutes", () => {
    expect(FOREGROUND_CHECK_INTERVAL_MS).toBe(15 * 60 * 1000);
  });
});

describe("shouldCheckForUpdate", () => {
  it("returns true when there has been no check yet", () => {
    expect(shouldCheckForUpdate(undefined, T)).toBe(true);
  });

  it("returns false 14 min 59 s after the last check", () => {
    expect(shouldCheckForUpdate(T, at(14 * MINUTE + 59 * SECOND))).toBe(false);
  });

  it("returns true exactly 15 min after the last check", () => {
    expect(shouldCheckForUpdate(T, at(15 * MINUTE))).toBe(true);
  });

  it("returns true 2 h after the last check", () => {
    expect(shouldCheckForUpdate(T, at(2 * HOUR))).toBe(true);
  });

  it("returns true when the last check is in the future (clock changed)", () => {
    expect(shouldCheckForUpdate(at(5 * MINUTE), T)).toBe(true);
  });

  it("uses minIntervalMs when given (1 min after the last check, 30 s interval)", () => {
    expect(shouldCheckForUpdate(T, at(1 * MINUTE), 30_000)).toBe(true);
  });
});
