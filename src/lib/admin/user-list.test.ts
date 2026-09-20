import { describe, expect, it } from "vitest";
import {
  USER_PAGE_SIZE,
  pageCount,
  pageRange,
  parseUserPage,
  sanitizeUserSearch,
  userListHref,
  userSearchFilter,
} from "./user-list";

describe("sanitizeUserSearch", () => {
  it("keeps the characters real usernames and names are made of", () => {
    expect(sanitizeUserSearch("e2e.admin.mk9z-1")).toBe("e2e.admin.mk9z-1");
    expect(sanitizeUserSearch("Maria Dela Cruz")).toBe("Maria Dela Cruz");
    expect(sanitizeUserSearch("juan_cruz")).toBe("juan_cruz");
  });

  it("strips the characters that would restructure a PostgREST or() filter", () => {
    // A bare comma would end the ilike filter and start another one; the
    // parens would close and reopen the or() group.
    expect(sanitizeUserSearch("a,b")).toBe("a b");
    expect(sanitizeUserSearch("x),role.eq.admin,(y")).toBe("x  role.eq.admin  y");
    expect(sanitizeUserSearch("%wild*card\\")).toBe("wild card");
  });

  it("trims, caps length, and treats missing input as no search", () => {
    expect(sanitizeUserSearch("  padded  ")).toBe("padded");
    expect(sanitizeUserSearch(undefined)).toBe("");
    expect(sanitizeUserSearch(null)).toBe("");
    expect(sanitizeUserSearch("a".repeat(200))).toHaveLength(80);
  });
});

describe("parseUserPage", () => {
  it("defaults to the first page for anything that is not a later page", () => {
    for (const input of [undefined, null, "", "0", "-3", "abc", "1"]) {
      expect(parseUserPage(input)).toBe(1);
    }
  });

  it("accepts a later page", () => {
    expect(parseUserPage("2")).toBe(2);
    expect(parseUserPage("42")).toBe(42);
  });
});

describe("pageRange", () => {
  it("returns an inclusive window of one page size", () => {
    expect(pageRange(1, 25)).toEqual({ from: 0, to: 24 });
    expect(pageRange(3, 25)).toEqual({ from: 50, to: 74 });
  });

  it("defaults to the shared page size", () => {
    expect(pageRange(2)).toEqual({ from: USER_PAGE_SIZE, to: USER_PAGE_SIZE * 2 - 1 });
  });
});

describe("pageCount", () => {
  it("rounds partial pages up and never reports zero pages", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(1, 25)).toBe(1);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
    // The row count that motivated this change (issue #58).
    expect(pageCount(1051, 25)).toBe(43);
  });
});

describe("userSearchFilter", () => {
  it("matches the term against both the username and the full name", () => {
    expect(userSearchFilter("cruz")).toBe("username.ilike.%cruz%,full_name.ilike.%cruz%");
  });
});

describe("userListHref", () => {
  it("omits the defaults so the plain list keeps a clean URL", () => {
    expect(userListHref("", 1)).toBe("/admin/users");
  });

  it("carries the search across pages and encodes it", () => {
    expect(userListHref("cruz", 1)).toBe("/admin/users?q=cruz");
    expect(userListHref("cruz", 3)).toBe("/admin/users?q=cruz&page=3");
    expect(userListHref("dela cruz", 2)).toBe("/admin/users?q=dela+cruz&page=2");
  });
});
