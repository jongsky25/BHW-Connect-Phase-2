import type { TestPhase } from "./types";

export type SessionTestAttempt = {
  bhw_user_id: string;
  phase: TestPhase;
  score_percent: number;
};

export type CohortSummary = {
  pretestAverage: number | null;
  posttestAverage: number | null;
  // Average of (posttest - pretest) over BHWs who have BOTH scores, not
  // posttestAverage - pretestAverage over the two (possibly different)
  // respondent sets — the two are only the same number when every BHW who
  // took the pretest also took the posttest.
  deltaAverage: number | null;
  pretestCount: number;
  posttestCount: number;
  pairedCount: number;
};

// §INC-23 session summary: cohort average pretest vs posttest, computed
// client-side over the already-fetched roster (no rpc_session_summary — a
// session's roster is small). Pulled out as a pure function so the
// arithmetic itself is unit-testable against hand-computed values, per the
// verification style INC-8's KPI panel DoD used.
export function computeCohortSummary(attempts: SessionTestAttempt[]): CohortSummary {
  const pretest = attempts.filter((a) => a.phase === "pretest");
  const posttest = attempts.filter((a) => a.phase === "posttest");

  const average = (rows: SessionTestAttempt[]) =>
    rows.length === 0 ? null : rows.reduce((sum, r) => sum + r.score_percent, 0) / rows.length;

  const posttestByBhw = new Map(posttest.map((r) => [r.bhw_user_id, r.score_percent]));
  const deltas = pretest
    .map((r) => {
      const post = posttestByBhw.get(r.bhw_user_id);
      return post === undefined ? null : post - r.score_percent;
    })
    .filter((d): d is number => d !== null);

  return {
    pretestAverage: average(pretest),
    posttestAverage: average(posttest),
    deltaAverage: deltas.length === 0 ? null : deltas.reduce((sum, d) => sum + d, 0) / deltas.length,
    pretestCount: pretest.length,
    posttestCount: posttest.length,
    pairedCount: deltas.length,
  };
}
