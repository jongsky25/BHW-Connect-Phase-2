// delivery-plan.md §5.1: 5 failed attempts -> 15-minute lockout.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
