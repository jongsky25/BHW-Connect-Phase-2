import { describe, expect, it } from "vitest";
import type { FeatureFlags } from "@/lib/flags/types";
import { getNavItems } from "./nav-items";

const ALL_OFF: FeatureFlags = {
  kb_articles: true,
  reports_export: true,
  announcements: false,
  surveys: false,
  elearning: false,
  course_sessions: false,
  forum: false,
  flipcharts: false,
  offline_pwa: false,
  notifications: false,
  chat_conversation: false,
  ai_external: false,
  ai_gap_draft: false,
};

const ALL_ON: FeatureFlags = {
  ...ALL_OFF,
  announcements: true,
  surveys: true,
  elearning: true,
  course_sessions: true,
  forum: true,
  flipcharts: true,
};

function ids(items: ReturnType<typeof getNavItems>) {
  return items.map((item) => item.id);
}

describe("getNavItems", () => {
  it("shows only the always-on items for a bhw with every flag off", () => {
    expect(ids(getNavItems({ role: "bhw", flags: ALL_OFF }))).toEqual(["chat", "kb", "settings"]);
  });

  it("shows every flag-gated item, but not role-gated ones, for a bhw with every flag on", () => {
    expect(ids(getNavItems({ role: "bhw", flags: ALL_ON }))).toEqual([
      "chat",
      "kb",
      "announcements",
      "surveys",
      "courses",
      "forum",
      "flipcharts",
      "settings",
    ]);
  });

  it("shows assessments and training-sessions only for an assessor, and only once elearning (plus course_sessions) is on", () => {
    expect(ids(getNavItems({ role: "assessor", flags: ALL_OFF }))).toEqual(["chat", "kb", "settings"]);

    const elearningOnly: FeatureFlags = { ...ALL_OFF, elearning: true };
    expect(ids(getNavItems({ role: "assessor", flags: elearningOnly }))).toEqual([
      "chat",
      "kb",
      "courses",
      "assessments",
      "settings",
    ]);

    expect(ids(getNavItems({ role: "assessor", flags: ALL_ON }))).toEqual([
      "chat",
      "kb",
      "announcements",
      "surveys",
      "courses",
      "assessments",
      "training-sessions",
      "forum",
      "flipcharts",
      "settings",
    ]);
  });

  it("shows designer-flipcharts only for a designer, and only once flipcharts is on", () => {
    expect(ids(getNavItems({ role: "designer", flags: ALL_OFF }))).toEqual(["chat", "kb", "settings"]);

    expect(ids(getNavItems({ role: "designer", flags: ALL_ON }))).toEqual([
      "chat",
      "kb",
      "announcements",
      "surveys",
      "courses",
      "forum",
      "flipcharts",
      "designer-flipcharts",
      "settings",
    ]);
  });

  it("shows admin-users only for an admin", () => {
    expect(ids(getNavItems({ role: "admin", flags: ALL_OFF }))).toEqual(["chat", "kb", "settings", "admin-users"]);
    expect(ids(getNavItems({ role: "bhw", flags: ALL_OFF }))).not.toContain("admin-users");
  });

  it("never shows assessments/training-sessions/designer-flipcharts to a bhw, even with every flag on", () => {
    const items = ids(getNavItems({ role: "bhw", flags: ALL_ON }));
    expect(items).not.toContain("assessments");
    expect(items).not.toContain("training-sessions");
    expect(items).not.toContain("designer-flipcharts");
    expect(items).not.toContain("admin-users");
  });

  it("marks chat as the primary variant and leaves the rest default", () => {
    const items = getNavItems({ role: "bhw", flags: ALL_OFF });
    expect(items.find((item) => item.id === "chat")?.variant).toBe("primary");
    expect(items.find((item) => item.id === "kb")?.variant).toBeUndefined();
    expect(items.find((item) => item.id === "settings")?.variant).toBeUndefined();
  });
});
