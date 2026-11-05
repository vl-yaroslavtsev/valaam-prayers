import { describe, expect, it } from "vitest";
import {
  formatDateShort,
  formatNames,
  formatPeriod,
  formatPrice,
  isValidEmail,
} from "@/services/rites/ritesFormat";

// 2020-12-29 00:00 по Москве
const DEC_29_2020_MSK = 1609189200;
// 2021-01-07 00:00 по Москве
const JAN_07_2021_MSK = 1609966800;
// 2026-11-09 00:00 по Москве
const NOV_09_2026_MSK = 1794171600;

const point = (ts: number) => ({ ts, value: "" });

describe("formatPrice", () => {
  it("разделяет тысячи неразрывным пробелом", () => {
    expect(formatPrice(555400).replace(/\s/g, " ")).toBe("555 400");
    expect(formatPrice(10)).toBe("10");
  });
});

describe("formatDateShort", () => {
  it("показывает дату по Москве независимо от часового пояса устройства", () => {
    expect(formatDateShort(DEC_29_2020_MSK, true)).toBe("29 дек. 2020");
    expect(formatDateShort(DEC_29_2020_MSK, false)).toBe("29 дек.");
    // 21:00 UTC предыдущих суток — это уже полночь по Москве
    expect(formatDateShort(DEC_29_2020_MSK - 1, true)).toBe("28 дек. 2020");
  });
});

describe("formatPeriod", () => {
  it("без даты начала периода нет", () => {
    expect(formatPeriod(undefined)).toBeNull();
    expect(formatPeriod({})).toBeNull();
  });

  it("один день: только from, с годом", () => {
    expect(formatPeriod({ from: point(DEC_29_2020_MSK) })).toEqual({
      from: "29 дек. 2020",
      to: null,
    });
  });

  it("совпадающие from и to считаются одним днём", () => {
    expect(formatPeriod({ from: point(DEC_29_2020_MSK), to: point(DEC_29_2020_MSK) })).toEqual({
      from: "29 дек. 2020",
      to: null,
    });
  });

  it("период в разных годах: год у обеих дат", () => {
    expect(formatPeriod({ from: point(DEC_29_2020_MSK), to: point(JAN_07_2021_MSK) })).toEqual({
      from: "29 дек. 2020",
      to: "7 янв. 2021",
    });
  });

  it("период в одном году: год только у конца", () => {
    const to = NOV_09_2026_MSK + 38 * 86400;
    expect(formatPeriod({ from: point(NOV_09_2026_MSK), to: point(to) })).toEqual({
      from: "9 нояб.",
      to: "17 дек. 2026",
    });
  });
});

describe("formatNames", () => {
  it("склеивает пояснение и имя через запятую", () => {
    expect(
      formatNames([
        { name: "Андрей", explanation: "" },
        { name: "Игорь", explanation: "болящего" },
      ]),
    ).toBe("Андрей, болящего Игорь");
  });
});

describe("isValidEmail", () => {
  it("принимает обычный адрес и отклоняет мусор", () => {
    expect(isValidEmail("a@b.ru")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("не адрес")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});
