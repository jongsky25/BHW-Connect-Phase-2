import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gabayCharts, gabaySources } from "./gabay-charts";

describe("Gabay flipchart review packet", () => {
  it("has nine complete bilingual, illustrated cards with traceable claims", () => {
    expect(gabayCharts.map((chart) => chart.slug)).toEqual(["yakap", "gamot", "rehistro"]);
    expect(gabayCharts.every((chart) => chart.pages.length === 3)).toBe(true);
    for (const chart of gabayCharts) {
      expect(chart.review).toBe("draft");
      for (const page of chart.pages) {
        expect(existsSync(path.join(process.cwd(), "public", page.image))).toBe(true);
        for (const language of ["fil", "en"] as const) {
          expect(page.alt[language].trim()).not.toBe("");
          expect(page.caption[language].trim()).not.toBe("");
          expect(page.notes[language].trim()).not.toBe("");
        }
        expect(page.claims.length).toBeGreaterThan(0);
        for (const id of page.claims) {
          if (id.startsWith("PH-")) {
            expect(gabaySources[id]?.length).toBeGreaterThan(0);
            for (const source of gabaySources[id]) expect(source.url).toMatch(/^https:\/\/www\.philhealth\.gov\.ph\//);
          }
        }
      }
    }
  });
});
