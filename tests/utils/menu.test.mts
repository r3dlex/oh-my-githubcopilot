/**
 * Menu Utility Unit Tests
 */

import { describe, it, expect } from "vitest";
import { renderMenu, parseMenuResponse } from "../../src/utils/menu.mts";
import type { Menu } from "../../src/utils/menu.mts";

const basicMenu: Menu = {
  title: "Choose an action",
  options: [
    { key: "1", label: "Start", value: "start" },
    { key: "2", label: "Stop", value: "stop" },
    { key: "3", label: "Restart", value: "restart" },
  ],
  allowFreetext: false,
};

describe("renderMenu", () => {
  it("should render the title as the first line", () => {
    const output = renderMenu(basicMenu);
    expect(output.startsWith("Choose an action")).toBe(true);
  });

  it("should render each option with key and label", () => {
    const output = renderMenu(basicMenu);
    expect(output).toContain("1. Start");
    expect(output).toContain("2. Stop");
    expect(output).toContain("3. Restart");
  });

  it("should separate title from options with a blank line", () => {
    const output = renderMenu(basicMenu);
    const lines = output.split("\n");
    expect(lines[1]).toBe("");
  });

  it("should not include freetext option when allowFreetext is false", () => {
    const output = renderMenu(basicMenu);
    expect(output).not.toContain("4.");
    expect(output).not.toContain("Type something else");
  });

  it("should append freetext option when allowFreetext is true", () => {
    const menu: Menu = { ...basicMenu, allowFreetext: true };
    const output = renderMenu(menu);
    expect(output).toContain("4. Type something else:");
  });

  it("should use custom freetextPrompt when provided", () => {
    const menu: Menu = {
      ...basicMenu,
      allowFreetext: true,
      freetextPrompt: "Enter a custom value:",
    };
    const output = renderMenu(menu);
    expect(output).toContain("4. Enter a custom value:");
    expect(output).not.toContain("Type something else:");
  });

  it("should handle a menu with no options and allowFreetext true", () => {
    const menu: Menu = {
      title: "Empty",
      options: [],
      allowFreetext: true,
    };
    const output = renderMenu(menu);
    expect(output).toContain("1. Type something else:");
  });
});

describe("parseMenuResponse", () => {
  it("should return option type and value for a matching key", () => {
    const result = parseMenuResponse(basicMenu, "1");
    expect(result).toEqual({ type: "option", value: "start" });
  });

  it("should return option type for second option", () => {
    const result = parseMenuResponse(basicMenu, "2");
    expect(result).toEqual({ type: "option", value: "stop" });
  });

  it("should trim whitespace before matching", () => {
    const result = parseMenuResponse(basicMenu, "  3  ");
    expect(result).toEqual({ type: "option", value: "restart" });
  });

  it("should return freetext type for unmatched input", () => {
    const result = parseMenuResponse(basicMenu, "something custom");
    expect(result).toEqual({ type: "freetext", value: "something custom" });
  });

  it("should return freetext for numeric input that does not match any key", () => {
    const result = parseMenuResponse(basicMenu, "99");
    expect(result).toEqual({ type: "freetext", value: "99" });
  });

  it("should return freetext with trimmed value", () => {
    const result = parseMenuResponse(basicMenu, "  hello world  ");
    expect(result).toEqual({ type: "freetext", value: "hello world" });
  });

  it("should return freetext for empty string input", () => {
    const result = parseMenuResponse(basicMenu, "");
    expect(result).toEqual({ type: "freetext", value: "" });
  });

  it("should return freetext for whitespace-only input", () => {
    const result = parseMenuResponse(basicMenu, "   ");
    expect(result).toEqual({ type: "freetext", value: "" });
  });
});
