import clarifiersFile from "../../../content/kb/hhp-ncd/clarifiers.json";
import redFlagsFile from "../../../content/kb/hhp-ncd/red-flags.json";
import type { Clarifier, RedFlagRule } from "./types";

// Red-flag and clarifier rules ship as versioned content files rather than
// database rows, and are bundled at build time. That is deliberate: unlike KB
// answers, these are routing rules whose review history matters, and a change
// to one should go through the same pull request as a change to the fixtures
// that prove it works. scripts/lib/kb-content.mjs validates them at load time
// (every target must be a published entry, every phrase must already be
// normalized), and the chat_conversation flag is the kill switch if a rule
// misbehaves in the field.
//
// The trade-off: fixing a rule needs a deploy, where fixing a KB answer does
// not. Turning the flag off is the no-deploy mitigation in the meantime.

export const redFlagRules: RedFlagRule[] = redFlagsFile.red_flags as RedFlagRule[];
export const clarifierRules: Clarifier[] = clarifiersFile.clarifiers as Clarifier[];
