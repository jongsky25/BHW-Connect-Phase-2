import { describe, expect, it } from "vitest";
import { parseTimeRangeKey, timeRangeToDates } from "./time-range";

describe("parseTimeRangeKey", () => {
  it("accepts the known range keys", () => {
    expect(parseTimeRangeKey("7")).toBe("7");
    expect(parseTimeRangeKey("30")).toBe("30");
    expect(parseTimeRangeKey("90")).toBe("90");
  });

  it("defaults to 30 days for missing or unknown values", () => {
    expect(parseTimeRangeKey(undefined)).toBe("30");
    expect(parseTimeRangeKey("365")).toBe("30");
    expect(parseTimeRangeKey("")).toBe("30");
  });
});

describe("timeRangeToDates", () => {
  it("computes a start date N days before end, with end as now", () => {
    const now = new Date("2026-07-21T12:00:00.000Z");
    const { start, end } = timeRangeToDates("7", now);
    expect(end).toBe(now.toISOString());
    expect(start).toBe(new Date("2026-07-14T12:00:00.000Z").toISOString());
  });

  it("handles the 90-day range", () => {
    const now = new Date("2026-07-21T00:00:00.000Z");
    const { start } = timeRangeToDates("90", now);
    expect(start).toBe(new Date("2026-04-22T00:00:00.000Z").toISOString());
  });
});
