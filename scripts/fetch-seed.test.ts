import { describe, expect, it } from "vitest";
import {
  calendarDownloadRange,
  formatDateCode,
  inclusiveDayCount,
  isImageBuffer,
  isRealDateCode,
  nextDateCode,
  safeIconRelative,
  selectUpcomingIcons,
  validateWidgetItems,
} from "./fetch-seed.mjs";

function day(date: string, id: number, icon: string | null = "/upload/iblock/abc/saint.webp") {
  return {
    id,
    date,
    date_old: "20260101",
    week: "Седмица 1-я",
    tone: 1 as number | null,
    icon,
    icon_desc: icon ? "Святой" : null,
    fasting: { type: "none", title: "Поста нет", rules: { monastic: { code: "none", title: "Поста нет" }, lay: null } },
    saints_items: [{ sign: null, big: false, parts: [{ t: "Прп. ", name: false, bold: false }] }],
  };
}

describe("даты", () => {
  it("формат кода даты", () => {
    expect(formatDateCode(new Date(2026, 9, 20))).toBe("20261020");
  });

  it("считает дни диапазона, включая високосный", () => {
    expect(inclusiveDayCount("20240114", "20250113")).toBe(366);
    expect(inclusiveDayCount("20260114", "20270113")).toBe(365);
    expect(nextDateCode("20240228")).toBe("20240229");
    expect(nextDateCode("20260228")).toBe("20260301");
    expect(isRealDateCode("20260229")).toBe(false);
  });
});

describe("диапазон календаря", () => {
  it("совпадает с диапазоном загрузки нативки: с 14 января по 13 января следующего года", () => {
    expect(calendarDownloadRange(new Date(2026, 9, 27))).toEqual({ from: "20260114", to: "20270113" });
    expect(calendarDownloadRange(new Date(2026, 0, 14))).toEqual({ from: "20260114", to: "20270113" });
    expect(calendarDownloadRange(new Date(2026, 11, 31))).toEqual({ from: "20260114", to: "20270113" });
  });

  it("1–13 января захватывает два года", () => {
    expect(calendarDownloadRange(new Date(2026, 0, 1))).toEqual({ from: "20250114", to: "20270113" });
    expect(calendarDownloadRange(new Date(2026, 0, 13))).toEqual({ from: "20250114", to: "20270113" });
  });
});

describe("иконки виджета", () => {
  it("берёт пути upload/ с сегодняшнего дня вперёд и пропускает дни без файла", () => {
    const items = [
      day("20261019", 1),
      day("20261020", 2, null),
      day("20261021", 3, "/upload/webp/api/iblock/2f8/414_q75/a.webp"),
      day("20261022", 4, "/upload/../secret.webp"),
      day("20261023", 5),
    ];
    expect(selectUpcomingIcons(items, "20261020", 2)).toEqual([
      "upload/webp/api/iblock/2f8/414_q75/a.webp",
      "upload/iblock/abc/saint.webp",
    ]);
  });

  it("принимает путь /upload и отклоняет выход из каталога", () => {
    expect(safeIconRelative("/upload/webp/api/iblock/2f8/414_q75/a.webp")).toBe("upload/webp/api/iblock/2f8/414_q75/a.webp");
    expect(safeIconRelative("/upload/../etc/passwd")).toBeNull();
    expect(safeIconRelative("https://app.valaam.ru/upload/a.webp")).toBeNull();
  });

  it("узнаёт webp и отвергает html", () => {
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(isImageBuffer(webp)).toBe(true);
    expect(isImageBuffer(new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0, 0, 0, 0, 0, 0, 0]))).toBe(false);
  });
});

describe("validateWidgetItems", () => {
  it("принимает непрерывный диапазон с числовым id", () => {
    const items = [day("20261020", 1), day("20261021", 2, null)];
    expect(validateWidgetItems(items, { from: "20261020", to: "20261021" })).toEqual([]);
  });

  it("сообщает о пропуске даты и битом посте", () => {
    const broken = day("20261022", 2);
    broken.fasting.rules.monastic = null as unknown as { code: string; title: string };
    const problems = validateWidgetItems([day("20261020", 1), broken], { from: "20261020", to: "20261021" });
    expect(problems.some((problem) => problem.includes("ожидалась 20261021"))).toBe(true);
    expect(problems.some((problem) => problem.includes("monastic"))).toBe(true);
  });
});
