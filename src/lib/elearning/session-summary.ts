import type { TestPhase } from "./types";

export type SessionTestAttempt = {
  id?: string;
  bhw_user_id: string;
  phase: TestPhase;
  score_percent: number;
  generation?: "legacy" | "v2";
  form_id?: string;
  release_id?: string;
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
  groups: { label: string; phase: TestPhase; count: number; average: number }[];
};

// §INC-23 session summary: cohort average pretest vs posttest, computed
// client-side over the already-fetched roster (no rpc_session_summary — a
// session's roster is small). Pulled out as a pure function so the
// arithmetic itself is unit-testable against hand-computed values, per the
// verification style INC-8's KPI panel DoD used.
export function computeCohortSummary(attempts: SessionTestAttempt[]): CohortSummary {
  const pretest = attempts.filter((a) => a.phase === "pretest");
  const posttest = attempts.filter((a) => a.phase === "posttest");
  const containsV2 = attempts.some(a => a.generation === "v2");

  const average = (rows: SessionTestAttempt[]) =>
    rows.length === 0 ? null : rows.reduce((sum, r) => sum + r.score_percent, 0) / rows.length;

  const posttestByBhw = new Map(posttest.map((r) => [r.bhw_user_id, r]));
  const deltas = pretest
    .map((r) => {
      const post = posttestByBhw.get(r.bhw_user_id);
      return post === undefined || r.generation === "v2" || post.generation === "v2"
        ? null : post.score_percent - r.score_percent;
    })
    .filter((d): d is number => d !== null);

  const grouped = new Map<string, SessionTestAttempt[]>();
  for (const row of attempts) {
    const label = row.generation === "v2" ? `${row.release_id ?? "v2"} / ${row.form_id ?? "form unknown"}` : "Legacy form";
    const key = `${row.phase}:${label}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  const groups = [...grouped.entries()].map(([key, rows]) => ({
    label: key.slice(key.indexOf(":") + 1), phase: rows[0].phase, count: rows.length,
    average: average(rows)!,
  }));

  return {
    pretestAverage: containsV2 ? null : average(pretest),
    posttestAverage: containsV2 ? null : average(posttest),
    deltaAverage: containsV2 || deltas.length === 0 ? null : deltas.reduce((sum, d) => sum + d, 0) / deltas.length,
    pretestCount: pretest.length,
    posttestCount: posttest.length,
    pairedCount: containsV2 ? 0 : deltas.length,
    groups,
  };
}
