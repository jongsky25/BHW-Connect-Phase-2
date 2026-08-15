import { TIER_B_PERMITTED, type DataClassification } from "./types";

// The core safeguard from free-ai-leverage-plan.md §2.
//
// Deliberately an allowlist membership test rather than a "reject these two"
// check: if a sixth classification is ever added to the union, it is rejected
// from external calls until someone makes an explicit decision about it. A
// denylist would silently permit it — which is exactly the failure mode the
// plan's allowlist framing exists to avoid ("scrubbing personal data out of
// arbitrary text is a blocklist approach and blocklists miss things").
export function isTierBPermitted(classification: DataClassification): boolean {
  return TIER_B_PERMITTED.includes(classification);
}
