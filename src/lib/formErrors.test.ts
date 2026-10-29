import { describe, it, expect, vi, beforeEach } from "vitest";
import { focusFirstError, passwordHints } from "./formErrors";

describe("passwordHints", () => {
  it("returns nothing for a valid password", () => {
    expect(passwordHints("Abcdefghij1!")).toEqual([]);
  });
  it("uses singular wording when one character short", () => {
    expect(passwordHints("Abcdefghi1!")).toEqual(["Add 1 more character (needs 12, has 11)"]);
  });
  it("uses plural wording and counts exactly", () => {
    expect(passwordHints("Abcdef1!x")).toEqual(["Add 3 more characters (needs 12, has 9)"]);
  });
  it("lists every unmet rule", () => {
    expect(passwordHints("")).toEqual([
      "Add 12 more characters (needs 12, has 0)",
      "Add an uppercase letter",
      "Add a lowercase letter",
      "Add a number",
      "Add a symbol such as ! or #",
    ]);
  });
});

describe("focusFirstError", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input data-field="a" />
      <input data-field="b" />
      <div data-field="c"><input id="inner" /></div>`;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("focuses the first error following the given order", () => {
    focusFirstError({ a: "x", b: "y" }, ["b", "a"]);
    expect(document.activeElement).toBe(document.querySelector('[data-field="b"]'));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "smooth",
    });
  });
  it("falls back to object key order", () => {
    focusFirstError({ a: undefined, b: "y" });
    expect(document.activeElement).toBe(document.querySelector('[data-field="b"]'));
  });
  it("focuses the first focusable descendant of a wrapper", () => {
    focusFirstError({ c: "z" });
    expect(document.activeElement).toBe(document.getElementById("inner"));
  });
  it("is a no-op when the field is missing", () => {
    expect(() => focusFirstError({ nope: "x" })).not.toThrow();
  });
});
