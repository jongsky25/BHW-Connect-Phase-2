import { describe, expect, it } from "vitest";
import { computeCohortSummary } from "./session-summary";

describe("computeCohortSummary", () => {
  it("hand-computed cohort against a seeded two-BHW fixture", () => {
    // Mirrors the fixture used to verify RLS scoping for INC-23 (see the
    // session's handoff report): bhw.one 50 -> 90, bhw.two 60 -> 80.
    // Hand-computed: pretest avg 55, posttest avg 85, delta avg 30.
    const summary = computeCohortSummary([
      { bhw_user_id: "bhw-1", phase: "pretest", score_percent: 50 },
      { bhw_user_id: "bhw-1", phase: "posttest", score_percent: 90 },
      { bhw_user_id: "bhw-2", phase: "pretest", score_percent: 60 },
      { bhw_user_id: "bhw-2", phase: "posttest", score_percent: 80 },
    ]);

    expect(summary.pretestAverage).toBe(55);
    expect(summary.posttestAverage).toBe(85);
    expect(summary.deltaAverage).toBe(30);
    expect(summary.pretestCount).toBe(2);
    expect(summary.posttestCount).toBe(2);
    expect(summary.pairedCount).toBe(2);
  });

  it("returns nulls with no attempts", () => {
    const summary = computeCohortSummary([]);
    expect(summary.pretestAverage).toBeNull();
    expect(summary.posttestAverage).toBeNull();
    expect(summary.deltaAverage).toBeNull();
  });

  it("only pairs BHWs who have both a pretest and a posttest", () => {
    const summary = computeCohortSummary([
      { bhw_user_id: "bhw-1", phase: "pretest", score_percent: 40 },
      { bhw_user_id: "bhw-1", phase: "posttest", score_percent: 70 },
      // bhw-2 has only taken the pretest so far — counts toward
      // pretestAverage but must not appear in deltaAverage.
      { bhw_user_id: "bhw-2", phase: "pretest", score_percent: 60 },
    ]);

    expect(summary.pretestAverage).toBe(50);
    expect(summary.posttestAverage).toBe(70);
    expect(summary.deltaAverage).toBe(30);
    expect(summary.pairedCount).toBe(1);
  });
});
