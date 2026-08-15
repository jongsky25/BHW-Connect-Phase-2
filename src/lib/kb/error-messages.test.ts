import { describe, expect, it } from "vitest";
import { mapKbRpcError } from "./error-messages";

describe("mapKbRpcError", () => {
  it("maps not-authorized", () => {
    expect(mapKbRpcError("not authorized")).toBe("notAuthorizedError");
  });

  it("maps the publish-without-owner guard", () => {
    expect(mapKbRpcError("an owner is required to publish")).toBe("ownerRequiredError");
  });

  it("maps not-found messages for entries and articles", () => {
    expect(mapKbRpcError("entry not found")).toBe("entryNotFoundError");
    expect(mapKbRpcError("article not found")).toBe("articleNotFoundError");
  });

  it("maps the bulk-assign guards", () => {
    expect(mapKbRpcError("no entries selected")).toBe("noEntriesSelectedError");
    expect(mapKbRpcError("bulk: an owner is required")).toBe("bulkOwnerRequiredError");
  });

  it("maps the AI-draft review gate", () => {
    // The exact string rpc_kb_entry_update raises. Without this mapping the
    // gate presents as "Something went wrong", which gives the admin no way to
    // work out that ticking a checkbox is what they are missing.
    expect(mapKbRpcError('ai draft must be reviewed before publishing')).toBe(
      "aiDraftUnreviewedError",
    );
    expect(mapKbRpcError("entry is not an ai draft")).toBe("notAiDraftError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapKbRpcError("something unexpected")).toBe("genericError");
    expect(mapKbRpcError(undefined)).toBe("genericError");
  });
});
