import { describe, it, expect } from "vitest";
import { formatWon, formatWonCompact } from "../won";

describe("won formatters", () => {
  it("formats KRW with separators", () => {
    expect(formatWon(15500)).toBe("₩15,500");
    expect(formatWon(0)).toBe("₩0");
    expect(formatWon(1234567)).toBe("₩1,234,567");
  });

  it("compact above 10,000", () => {
    expect(formatWonCompact(9999)).toBe("₩9,999");
    expect(formatWonCompact(10000)).toBe("1만원");
    expect(formatWonCompact(15500)).toBe("1.6만원");
  });
});
