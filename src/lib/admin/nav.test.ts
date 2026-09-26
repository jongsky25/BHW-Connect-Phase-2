import { describe, expect, it } from "vitest";
import { isAdminNavItemActive, visibleAdminNavGroups } from "./nav";

describe("visibleAdminNavGroups", () => {
  it("hides flag-gated items whose flag is off", () => {
    const groups = visibleAdminNavGroups({ flags: { kb_articles: false }, isSuperAdmin: false });
    const knowledge = groups.find((g) => g.id === "knowledge");
    expect(knowledge?.items.map((i) => i.key)).not.toContain("kbArticles");
  });

  it("shows flag-gated items whose flag is on", () => {
    const groups = visibleAdminNavGroups({ flags: { kb_articles: true }, isSuperAdmin: false });
    const knowledge = groups.find((g) => g.id === "knowledge");
    expect(knowledge?.items.map((i) => i.key)).toContain("kbArticles");
  });

  it("hides the super admin item for a non-super-admin", () => {
    const groups = visibleAdminNavGroups({ flags: {}, isSuperAdmin: false });
    const system = groups.find((g) => g.id === "system");
    expect(system?.items.map((i) => i.key)).not.toContain("superAdmin");
  });

  it("shows the super admin item for a super admin", () => {
    const groups = visibleAdminNavGroups({ flags: {}, isSuperAdmin: true });
    const system = groups.find((g) => g.id === "system");
    expect(system?.items.map((i) => i.key)).toContain("superAdmin");
  });

  it("drops a group entirely once every item in it is hidden", () => {
    const groups = visibleAdminNavGroups({
      flags: { elearning: false, flipcharts: false },
      isSuperAdmin: false,
    });
    expect(groups.find((g) => g.id === "training")).toBeUndefined();
  });

  it("always shows unflagged items like the dashboard and feature flags", () => {
    const groups = visibleAdminNavGroups({ flags: {}, isSuperAdmin: false });
    expect(groups.find((g) => g.id === "overview")?.items.map((i) => i.key)).toContain("dashboard");
    expect(groups.find((g) => g.id === "system")?.items.map((i) => i.key)).toContain("flags");
  });
});

describe("isAdminNavItemActive", () => {
  it("matches an exact path", () => {
    expect(isAdminNavItemActive("/admin/users", "/admin/users")).toBe(true);
  });

  it("matches a nested path", () => {
    expect(isAdminNavItemActive("/admin/kb/entries", "/admin/kb/entries/new")).toBe(true);
  });

  it("does not match a sibling path with a shared prefix", () => {
    expect(isAdminNavItemActive("/admin/kb/entries", "/admin/kb/entries-archive")).toBe(false);
  });

  it("does not match an unrelated path", () => {
    expect(isAdminNavItemActive("/admin/users", "/admin/audit")).toBe(false);
  });
});
