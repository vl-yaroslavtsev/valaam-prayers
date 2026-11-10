import { describe, expect, it } from "vitest";
import { formatSearchPath } from "./formatSearchPath";

describe("formatSearchPath", () => {
  it("пустой путь — пустая строка", () => {
    expect(formatSearchPath([])).toBe("");
  });

  it("один и два сегмента показывает целиком", () => {
    expect(formatSearchPath(["Евангелие"])).toBe(" * Евангелие");
    expect(formatSearchPath(["Евангелие", "От Марка"])).toBe(" * Евангелие * От Марка");
  });

  it("больше двух сегментов: первый, «…» и последний", () => {
    expect(formatSearchPath(["Минеи", "Сентябрь", "В 8-й день"])).toBe(" * Минеи * … * В 8-й день");
    expect(formatSearchPath(["А", "Б", "В", "Г"])).toBe(" * А * … * Г");
  });
});
