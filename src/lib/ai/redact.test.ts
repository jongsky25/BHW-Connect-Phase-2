import { describe, expect, it } from "vitest";
import { REDACTED, contentHash, redact } from "./redact";

describe("redact", () => {
  it("removes Philippine mobile numbers in their common written forms", () => {
    for (const number of [
      "09171234567",
      "+639171234567",
      "0917 123 4567",
      "0917-123-4567",
    ]) {
      expect(redact(`tawagan sa ${number} bukas`), number).not.toContain("1234567");
    }
  });

  it("removes landline numbers", () => {
    expect(redact("(02) 8123-4567 ang health center")).not.toContain("8123");
  });

  it("removes email addresses", () => {
    expect(redact("email si ana at ana.cruz@example.com salamat")).toBe(
      `email si ana at ${REDACTED} salamat`,
    );
  });

  it("removes names from the supplied dictionary, case-insensitively", () => {
    expect(redact("si maria santos ang BHW", ["Maria Santos"])).toBe(`si ${REDACTED} ang BHW`);
  });

  it("replaces the longest matching name first", () => {
    // With "Maria" applied first, "Maria Santos" would leave "[naalis] Santos"
    // behind — a partial redaction that still identifies the person.
    const output = redact("si Maria Santos", ["Maria", "Maria Santos"]);
    expect(output).toBe(`si ${REDACTED}`);
    expect(output).not.toContain("Santos");
  });

  it("ignores very short dictionary entries", () => {
    // A two-letter name would match inside ordinary words and shred the text,
    // costing the model the context it needs without protecting anyone.
    expect(redact("ang presyon ay mataas", ["an"])).toBe("ang presyon ay mataas");
  });

  it("leaves clinical text untouched", () => {
    const clinical = "Ang 140/90 mmHg ay itinuturing na mataas ayon sa PhilPEN.";
    expect(redact(clinical)).toBe(clinical);
  });

  it("is a no-op when there is nothing to remove", () => {
    expect(redact("paano sukatin ang presyon")).toBe("paano sukatin ang presyon");
  });
});

describe("contentHash", () => {
  it("is stable for the same input", () => {
    expect(contentHash("hello")).toBe(contentHash("hello"));
  });

  it("differs for different input", () => {
    expect(contentHash("hello")).not.toBe(contentHash("hellp"));
  });

  it("is fixed width, so audit rows stay uniform", () => {
    expect(contentHash("")).toMatch(/^[0-9a-f]{8}$/);
    expect(contentHash("a much longer piece of text than the other one")).toMatch(/^[0-9a-f]{8}$/);
  });
});
