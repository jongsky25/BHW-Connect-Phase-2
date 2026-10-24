import { describe, expect, it } from "vitest";
import { kbCollection, kbTopicContext, kbTopicIdentity, kbTopicTitle } from "./collections";

describe("KB collection identity", () => {
  it("keeps Chapter 1 and HHP module sequences separate, independent of how many categories are displayed", () => {
    expect(kbTopicContext("day1-m5-barangay", "en")).toBe("Chapter 1 · Module 5 of 9");
    expect(kbTopicContext("hhp-m1-care-pathway", "en")).toBe("HHP+ / PhilPEN · Module 1 of 6");
    expect(kbTopicIdentity("day1-m1-tungkulin", "fil")).toBe("BHW Reference Manual · Kabanata 1 · Modyul 1 sa 9");
  });
  it("never infers chapter membership or a sequence from names or slug prefixes", () => {
    for (const slug of ["mch", "day1-m3-ra7883", "hhp-m9-new", "new-topic"]) {
      expect(kbCollection(slug)).toEqual({ id: "other", chapter: null, module: null, total: null });
      expect(kbTopicContext(slug, "en")).toBe("Reference topic");
    }
    expect(kbCollection("philhealth-yakap").module).toBeNull();
  });
  it("separates a leading module prefix from a topic title without altering other numbers or content", () => {
    expect(kbTopicTitle("Module 3 — RA 7883: Benefits and Rights")).toBe("RA 7883: Benefits and Rights");
    expect(kbTopicTitle("Modyul 5 — Ang BHW at Barangay")).toBe("Ang BHW at Barangay");
    expect(kbTopicTitle("7 ways to prepare")).toBe("7 ways to prepare");
  });
});
