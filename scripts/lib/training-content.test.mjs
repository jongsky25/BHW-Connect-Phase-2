import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadTrainingCourse, objectiveStartsWithBannedVerb, summaryLooksLikeObjectivesRestated } from "./training-content.mjs";

const COURSE = "fixture-course";
const MODULE = "01-test-module";

const VALID_SVG = `<svg viewBox="0 0 640 400"><title>Test diagram</title><circle cx="10" cy="10" r="5" fill="currentColor" /></svg>\n`;

function baseFiles() {
  return {
    "course.json": {
      id: COURSE,
      title_fil: "Kurso ng Pagsubok",
      title_en: "Test Course",
      description_fil: "",
      description_en: "",
      quiz_passing_percent: 80,
      quiz_max_attempts: 3,
    },
    "sources.json": {
      sources: {
        "src-a": { label_en: "Source A", label_fil: "Source A", publisher: "Test", year: 2020, url: "https://example.com/a" },
      },
    },
    "categories.json": {
      categories: [{ slug: "test-cat", sort_order: 1, module: 1, name_en: "Test", name_fil: "Test" }],
      domains: { "test-domain": { en: "Test domain", fil: "Test domain" } },
    },
    "test-questions.json": {
      questions: [
        {
          prompt_fil: "Tanong?",
          prompt_en: "Question?",
          options: [{ fil: "A", en: "A" }, { fil: "B", en: "B" }],
          correct_option_index: 0,
        },
      ],
    },
    [`modules/${MODULE}/module.json`]: {
      id: MODULE,
      position: 0,
      title_fil: "Modyul ng Pagsubok",
      title_en: "Test Module",
      objectives_fil: [
        "Maipapakita ng BHW ang halimbawang A.",
        "Matutukoy ng BHW ang halimbawang B.",
        "Maisasagawa ng BHW ang halimbawang C.",
      ],
      objectives_en: [
        "The BHW can demonstrate example A.",
        "The BHW can identify example B.",
        "The BHW can perform example C.",
      ],
      summary_fil:
        "Sa pagsasanay na ito, nakita natin kung paano nag-uugnay ang tatlong halimbawa sa isang buong proseso ng pagtulong sa pamilya at barangay.",
      summary_en:
        "This training showed how the three examples connect into one overall process of helping a family and their barangay.",
    },
    [`modules/${MODULE}/lesson.fil.md`]: [
      "## [concept/core] Isang seksyon {f.base}",
      "",
      "Ito ang nilalaman ng seksyon na ito.",
      "",
      ":::visual 1",
      ":::takeaway",
      "Ito ang natutunan tungkol sa halimbawang ipinakita sa seksyong ito.",
      ":::",
      "",
    ].join("\n"),
    [`modules/${MODULE}/lesson.en.md`]: [
      "## [concept/core] One section {f.base}",
      "",
      "This is the content of this section.",
      "",
      ":::visual 1",
      ":::takeaway",
      "This is what was learned about the example shown in this section.",
      ":::",
      "",
    ].join("\n"),
    [`modules/${MODULE}/coverage.json`]: {
      concepts: [{ id: "f.base", statement_en: "The one concept the fixture section delivers.", source: "deck slide 1" }],
    },
    [`modules/${MODULE}/facilitator-notes.fil.md`]: "# Facilitator notes\n\nTimimg, script, atbp.\n",
    [`modules/${MODULE}/facilitator-notes.en.md`]: "# Facilitator notes\n\nTiming, script, etc.\n",
    [`modules/${MODULE}/competency.json`]: {
      competency_statement_fil: "Pahayag ng kakayahan.",
      competency_statement_en: "Competency statement.",
      observation_indicators: [
        {
          objective_index: 0,
          observable_fil: "Nakikita",
          observable_en: "Observable",
          not_yet_fil: "Hindi pa",
          not_yet_en: "Not yet",
          levels: {
            kaya_na_fil: "a",
            kaya_na_en: "a",
            kailangan_practice_fil: "b",
            kailangan_practice_en: "b",
            hindi_pa_fil: "c",
            hindi_pa_en: "c",
          },
        },
      ],
    },
    [`modules/${MODULE}/visuals/visuals.json`]: {
      visuals: [
        {
          position: 1,
          primitive: "hub-spoke",
          file: "01-x.svg",
          caption_fil: "Caption fil",
          caption_en: "Caption en",
          alt_text_fil: "Alt fil",
          alt_text_en: "Alt en",
          tier: "core",
        },
      ],
    },
    [`modules/${MODULE}/visuals/01-x.svg`]: VALID_SVG,
    [`modules/${MODULE}/qa-entries.json`]: {
      category: "test-cat",
      entries: [
        {
          id: "test-entry-1",
          domain: "test-domain",
          tier: "cited",
          question_en: "What is this?",
          question_fil: "Ano ito?",
          answer_en: "This is a test entry.",
          answer_fil: "Ito ay entry para sa pagsubok.",
          keywords: ["test", "pagsubok", "fixture", "entry"],
          sources: ["src-a"],
        },
      ],
    },
  };
}

let tmpDirs = [];

afterEach(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
  tmpDirs = [];
});

function writeCourse(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "training-content-test-"));
  tmpDirs.push(root);
  const courseRoot = path.join(root, COURSE);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(courseRoot, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    const text = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
    writeFileSync(full, text);
  }
  return root;
}

function loadWith(mutate) {
  const files = baseFiles();
  mutate(files);
  const root = writeCourse(files);
  return loadTrainingCourse(COURSE, { root });
}

describe("loadTrainingCourse", () => {
  it("loads a valid fixture course without throwing", () => {
    const content = loadWith(() => {});
    expect(content.modules).toHaveLength(1);
    const mod = content.modules[0];
    expect(mod.lesson.sections).toHaveLength(1);
    expect(mod.lesson.sections[0].visual_position).toBe(1);
    expect(mod.visuals).toHaveLength(1);
    expect(mod.visuals[0].svg_markup).toContain("<svg");
    expect(content.qaEntries).toHaveLength(1);
    expect(content.reviewFlags).toEqual([]);
  });

  it("resolves a test question's module tag to that module's position; untagged is course-wide", () => {
    const content = loadWith((files) => {
      const [first] = files["test-questions.json"].questions;
      files["test-questions.json"].questions = [{ ...first, module: MODULE }, first];
      files[`modules/${MODULE}/module.json`].position = 4;
    });
    expect(content.testQuestions.map((q) => q.module_position)).toEqual([4, null]);
  });

  it("rejects a test question tagged to a module folder that does not exist", () => {
    expect(() =>
      loadWith((files) => {
        files["test-questions.json"].questions[0].module = "99-missing";
      }),
    ).toThrow(/module "99-missing" is not a module folder/);
  });

  it("rejects an SVG that fails the allowlist (script tag)", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/visuals/01-x.svg`] = `<svg viewBox="0 0 640 400"><script>alert(1)</script></svg>`;
      }),
    ).toThrow(/allowlist|forbidden tag/);
  });

  it("rejects a module with fewer than 3 objectives", () => {
    expect(() =>
      loadWith((files) => {
        const m = files[`modules/${MODULE}/module.json`];
        m.objectives_fil = m.objectives_fil.slice(0, 2);
        m.objectives_en = m.objectives_en.slice(0, 2);
      }),
    ).toThrow(/at least 3 objectives/);
  });

  it("rejects an objective starting with a banned verb", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/module.json`].objectives_fil[0] = "Malalaman ng BHW ang halimbawa.";
      }),
    ).toThrow(/banned verb/);
  });

  it("rejects an empty summary", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/module.json`].summary_fil = "";
      }),
    ).toThrow(/summary_fil is empty/);
  });

  it("rejects a summary that is a near-verbatim restatement of the objectives", () => {
    expect(() =>
      loadWith((files) => {
        const m = files[`modules/${MODULE}/module.json`];
        m.summary_fil = m.objectives_fil.join(" ");
      }),
    ).toThrow(/restated rather than synthesized/);
  });

  it("rejects a visual with blank alt text", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/visuals/visuals.json`].visuals[0].alt_text_fil = "";
      }),
    ).toThrow(/alt_text/);
  });

  it("rejects a lesson section whose visual_position has no matching visual", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/visuals/visuals.json`].visuals = [];
      }),
    ).toThrow(/visual position 1.*not in visuals\.json/);
  });

  it("rejects lesson.fil.md and lesson.en.md disagreeing on section count", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/lesson.en.md`] += "\n## [concept/standard] Extra section\n\nExtra body.\n";
      }),
    ).toThrow(/must match/);
  });

  it("rejects lesson.fil.md and lesson.en.md disagreeing on section tier", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/lesson.en.md`] = files[`modules/${MODULE}/lesson.en.md`].replace(
          "[concept/core]",
          "[concept/standard]",
        );
      }),
    ).toThrow(/tier differs between languages/);
  });

  it("rejects a check with mismatched option counts between languages", () => {
    expect(() =>
      loadWith((files) => {
        const withCheck = (heading) =>
          [
            `## [practice/core] ${heading}`,
            "",
            "Body.",
            "",
            ":::check",
            "? Prompt?",
            "- Wrong",
            "+ Right",
            "> Feedback.",
            ":::",
            "",
          ].join("\n");
        files[`modules/${MODULE}/lesson.fil.md`] += withCheck("Tanong");
        files[`modules/${MODULE}/lesson.en.md`] += [
          "## [practice/core] Question",
          "",
          "Body.",
          "",
          ":::check",
          "? Prompt?",
          "- Wrong 1",
          "- Wrong 2",
          "+ Right",
          "> Feedback.",
          ":::",
          "",
        ].join("\n");
      }),
    ).toThrow(/option count differs/);
  });

  it("rejects an observation indicator whose objective_index has no matching objective", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/competency.json`].observation_indicators[0].objective_index = 9;
      }),
    ).toThrow(/objective_index 9.*no matching objective/);
  });

  it("rejects a module with zero core-tier sections", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/lesson.fil.md`] = files[`modules/${MODULE}/lesson.fil.md`].replace(
          "[concept/core]",
          "[concept/standard]",
        );
        files[`modules/${MODULE}/lesson.en.md`] = files[`modules/${MODULE}/lesson.en.md`].replace(
          "[concept/core]",
          "[concept/standard]",
        );
      }),
    ).toThrow(/zero core-tier sections/);
  });

  it("rejects a qa-entries.json entry with fewer than 4 keywords", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/qa-entries.json`].entries[0].keywords = ["only", "two"];
      }),
    ).toThrow(/at least 4 keywords/);
  });

  it("rejects a qa-entries.json entry citing an unknown source", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/qa-entries.json`].entries[0].sources = ["does-not-exist"];
      }),
    ).toThrow(/unknown source/);
  });

  it("rejects a qa-entries.json category not declared in categories.json", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/qa-entries.json`].category = "not-a-real-category";
      }),
    ).toThrow(/not declared in this course's categories\.json/);
  });

  it("rejects a section heading missing its [kind/tier] tag", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/lesson.fil.md`] = files[`modules/${MODULE}/lesson.fil.md`].replace(
          "## [concept/core] Isang seksyon",
          "## Isang seksyon",
        );
      }),
    ).toThrow(/missing a required \[kind\/tier\] tag/);
  });

  it("rejects a retrieval check with no option marked correct", () => {
    expect(() =>
      loadWith((files) => {
        files[`modules/${MODULE}/lesson.fil.md`] += [
          "## [practice/core] May tanong",
          "",
          "Body.",
          "",
          ":::check",
          "? Prompt?",
          "- Wrong 1",
          "- Wrong 2",
          "> Feedback.",
          ":::",
          "",
        ].join("\n");
        files[`modules/${MODULE}/lesson.en.md`] += [
          "## [practice/core] Has a question",
          "",
          "Body.",
          "",
          ":::check",
          "? Prompt?",
          "- Wrong 1",
          "- Wrong 2",
          "> Feedback.",
          ":::",
          "",
        ].join("\n");
      }),
    ).toThrow(/exactly one option correct/);
  });

  it("flags (without hard-failing) an objective whose core sections don't share vocabulary with it", () => {
    const content = loadWith((files) => {
      const m = files[`modules/${MODULE}/module.json`];
      m.objectives_fil.push("Maipapaliwanag ang xenotransplantation.");
      m.objectives_en.push("The BHW can explain xenotransplantation.");
    });
    expect(content.reviewFlags.some((f) => f.includes("xenotransplantation"))).toBe(true);
  });
});

describe("§C.2 coverage", () => {
  // The fixture has one core section; these add a coverage.json to it.
  const withCoverage = (files, concepts, headingFil, headingEn) => {
    files[`modules/${MODULE}/coverage.json`] = { concepts };
    files[`modules/${MODULE}/lesson.fil.md`] = files[`modules/${MODULE}/lesson.fil.md`].replace(/^## \[.*$/m, headingFil);
    files[`modules/${MODULE}/lesson.en.md`] = files[`modules/${MODULE}/lesson.en.md`].replace(/^## \[.*$/m, headingEn);
  };
  const concept = (id) => ({ id, statement_en: `Statement for ${id}`, source: "deck slide 1" });

  it("accepts a module whose concepts are all delivered by a core section", () => {
    const content = loadWith((files) =>
      withCoverage(
        files,
        [concept("f.one"), concept("f.two")],
        "## [concept/core] Isang seksyon {f.one, f.two}",
        "## [concept/core] One section {f.one, f.two}",
      ),
    );
    expect(content.modules[0].lesson.sections[0].concept_ids).toEqual(["f.one", "f.two"]);
  });

  it("strips the coverage marker from the rendered heading", () => {
    const content = loadWith((files) =>
      withCoverage(files, [concept("f.one")], "## [concept/core] Isang seksyon {f.one}", "## [concept/core] One section {f.one}"),
    );
    expect(content.modules[0].lesson.sections[0].heading_fil).toBe("Isang seksyon");
    expect(content.modules[0].lesson.sections[0].heading_en).toBe("One section");
  });

  it("rejects a concept no section delivers", () => {
    expect(() =>
      loadWith((files) =>
        withCoverage(
          files,
          [concept("f.one"), concept("f.undelivered")],
          "## [concept/core] Isang seksyon {f.one}",
          "## [concept/core] One section {f.one}",
        ),
      ),
    ).toThrow(/f\.undelivered.*not delivered by any lesson section/s);
  });

  it("accepts an undelivered concept that is excused with redundant_with", () => {
    const content = loadWith((files) =>
      withCoverage(
        files,
        [concept("f.one"), { ...concept("f.filler"), redundant_with: "An unrelated interstitial slide." }],
        "## [concept/core] Isang seksyon {f.one}",
        "## [concept/core] One section {f.one}",
      ),
    );
    // The excused concept is not delivered, so it must not appear on any section.
    expect(content.modules[0].lesson.sections[0].concept_ids).toEqual(["f.one"]);
  });

  it("rejects a concept only a deep-tier section delivers", () => {
    expect(() =>
      loadWith((files) =>
        withCoverage(
          files,
          [concept("f.one")],
          "## [concept/deep] Isang seksyon {f.one}",
          "## [concept/deep] One section {f.one}",
        ),
      ),
    ).toThrow(/f\.one.*only delivered by a deep-tier section/s);
  });

  it("rejects a marker naming a concept id coverage.json does not declare", () => {
    expect(() =>
      loadWith((files) =>
        withCoverage(
          files,
          [concept("f.one")],
          "## [concept/core] Isang seksyon {f.one, f.typo}",
          "## [concept/core] One section {f.one, f.typo}",
        ),
      ),
    ).toThrow(/marks unknown concept id "f\.typo"/);
  });

  it("rejects coverage markers that differ between languages", () => {
    expect(() =>
      loadWith((files) =>
        withCoverage(
          files,
          [concept("f.one"), concept("f.two")],
          "## [concept/core] Isang seksyon {f.one, f.two}",
          "## [concept/core] One section {f.one}",
        ),
      ),
    ).toThrow(/coverage markers differ between languages/);
  });

  it("rejects a duplicate concept id in coverage.json", () => {
    expect(() =>
      loadWith((files) =>
        withCoverage(
          files,
          [concept("f.one"), concept("f.one")],
          "## [concept/core] Isang seksyon {f.one}",
          "## [concept/core] One section {f.one}",
        ),
      ),
    ).toThrow(/duplicate id "f\.one"/);
  });

  it("rejects a concept declared without a source citation", () => {
    expect(() =>
      loadWith((files) =>
        withCoverage(
          files,
          [{ id: "f.one", statement_en: "No citation." }],
          "## [concept/core] Isang seksyon {f.one}",
          "## [concept/core] One section {f.one}",
        ),
      ),
    ).toThrow(/missing source citation/);
  });

  it("flags — but does not reject — a module with no coverage.json at all", () => {
    const content = loadWith((files) => {
      delete files[`modules/${MODULE}/coverage.json`];
      files[`modules/${MODULE}/lesson.fil.md`] = files[`modules/${MODULE}/lesson.fil.md`].replace(" {f.base}", "");
      files[`modules/${MODULE}/lesson.en.md`] = files[`modules/${MODULE}/lesson.en.md`].replace(" {f.base}", "");
    });
    expect(content.reviewFlags.some((f) => f.includes("no coverage.json"))).toBe(true);
  });
});

describe("objectiveStartsWithBannedVerb", () => {
  it("rejects malalaman/understand/know", () => {
    expect(objectiveStartsWithBannedVerb("Malalaman ng BHW ang mga tungkulin niya.")).toBe(true);
    expect(objectiveStartsWithBannedVerb("Understand the roles of a BHW.")).toBe(true);
    expect(objectiveStartsWithBannedVerb("Know the roles of a BHW.")).toBe(true);
  });

  it("accepts observable-action verbs", () => {
    expect(objectiveStartsWithBannedVerb("Maililista ng BHW ang mga tungkulin niya.")).toBe(false);
    expect(objectiveStartsWithBannedVerb("The BHW can list their roles.")).toBe(false);
  });
});

describe("summaryLooksLikeObjectivesRestated", () => {
  it("flags a summary that is just the objectives concatenated", () => {
    const objectives = ["Maililista ng BHW ang apat na ugnayan.", "Matutukoy ng BHW ang tamang tao."];
    expect(summaryLooksLikeObjectivesRestated(objectives.join(" "), objectives)).toBe(true);
  });

  it("does not flag a summary that synthesizes with its own vocabulary", () => {
    const objectives = ["Maililista ng BHW ang apat na ugnayan.", "Matutukoy ng BHW ang tamang tao."];
    const summary =
      "Sa sitwasyon ni Aling Nena, apat na ugnayang ito ang gumana nang magkasabay — hindi lang isa — at ang RA 7883 ang batayang legal kung bakit umiiral ang tungkuling ito.";
    expect(summaryLooksLikeObjectivesRestated(summary, objectives)).toBe(false);
  });
});
