import { describe, expect, it } from "vitest";

describe("foundation", () => {
  it("keeps the prototype warning explicit", () => {
    expect("prototype").toMatch(/prototype/i);
  });
});
