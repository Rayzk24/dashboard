import { describe, expect, it } from "vitest";
import { nextEnabledOption, selectMenuPosition, type AppSelectOption } from "./AppSelect";

const options: AppSelectOption[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B", disabled: true },
  { value: "c", label: "C" },
];

describe("AppSelect", () => {
  it("navigue dans les deux sens en ignorant les options désactivées", () => {
    expect(nextEnabledOption(options, 0, 1)).toBe(2);
    expect(nextEnabledOption(options, 2, 1)).toBe(0);
    expect(nextEnabledOption(options, 0, -1)).toBe(2);
  });

  it("ouvre le menu au-dessus lorsqu’il manque de place dessous", () => {
    const position = selectMenuPosition(
      { left: 40, top: 650, bottom: 694, width: 220 },
      1024,
      720,
      6,
    );
    expect(position.placement).toBe("top");
    expect(position.width).toBeGreaterThanOrEqual(220);
    expect(position.top).toBeLessThan(650);
  });

  it("garde le menu dans la largeur d’un mobile", () => {
    const position = selectMenuPosition(
      { left: 330, top: 120, bottom: 164, width: 120 },
      375,
      812,
      4,
    );
    expect(position.left + position.width).toBeLessThanOrEqual(367);
    expect(position.width).toBeGreaterThanOrEqual(120);
  });
});
