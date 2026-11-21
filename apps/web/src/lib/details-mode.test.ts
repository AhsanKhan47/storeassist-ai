import { describe, expect, it } from "vitest";
import { wantsDetails } from "./details-mode.ts";

describe("wantsDetails", () => {
  it("turns on with ?details=1 or #details", () => {
    expect(wantsDetails("?details=1", "")).toBe(true);
    expect(wantsDetails("?q=x&details=true", "")).toBe(true);
    expect(wantsDetails("", "#details")).toBe(true);
    expect(wantsDetails("", "#Details")).toBe(true);
  });

  it("stays off otherwise", () => {
    expect(wantsDetails("", "")).toBe(false);
    expect(wantsDetails("?details=0", "")).toBe(false);
    expect(wantsDetails("?details", "")).toBe(false);
    expect(wantsDetails("", "#detailsx")).toBe(false);
    expect(wantsDetails("?detail=1", "#top")).toBe(false);
  });
});
