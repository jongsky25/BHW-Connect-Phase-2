import type { TimeRangeKey } from "./types";

const VALID_KEYS: readonly TimeRangeKey[] = ["7", "30", "90"];
const DEFAULT_KEY: TimeRangeKey = "30";

export function parseTimeRangeKey(value: string | undefined): TimeRangeKey {
  return (VALID_KEYS as readonly string[]).includes(value ?? "") ? (value as TimeRangeKey) : DEFAULT_KEY;
}

export function timeRangeToDates(key: TimeRangeKey, now: Date = new Date()): { start: string; end: string } {
  const days = Number(key);
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: now.toISOString() };
}
