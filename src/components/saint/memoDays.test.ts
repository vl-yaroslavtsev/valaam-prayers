import { describe, expect, it } from "vitest";
import {
  buildMemoDay,
  calculateEaster,
  formatMemoDate,
  getServiceDateLabel,
  nextMemoDate,
  parseMemoTemplate,
  resolveMemoDate,
} from "./memoDays";

const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

describe("calculateEaster", () => {
  it("совпадает с известными датами православной Пасхи", () => {
    expect(ymd(calculateEaster(2024))).toBe("2024-05-05");
    expect(ymd(calculateEaster(2025))).toBe("2025-04-20");
    expect(ymd(calculateEaster(2026))).toBe("2026-04-12");
    expect(ymd(calculateEaster(2027))).toBe("2027-05-02");
  });
});

describe("parseMemoTemplate", () => {
  it("разбирает все виды шаблонов", () => {
    expect(parseMemoTemplate("Y1015")).toEqual({ kind: "fixed", month: 10, day: 15 });
    expect(parseMemoTemplate("E+70")).toEqual({ kind: "easter", offset: 70 });
    expect(parseMemoTemplate("E-9")).toEqual({ kind: "easter", offset: -9 });
    expect(parseMemoTemplate("SU~0207")).toEqual({
      kind: "weekday",
      weekday: 0,
      mode: "~",
      month: 2,
      day: 7,
    });
    expect(parseMemoTemplate("SA>0830")).toMatchObject({ weekday: 6, mode: ">" });
  });

  it("неизвестный шаблон даёт null", () => {
    expect(parseMemoTemplate("X123")).toBeNull();
    expect(parseMemoTemplate("")).toBeNull();
  });
});

describe("resolveMemoDate", () => {
  it("фиксированная дата; 29 февраля в невисокосный год переносится на 28", () => {
    expect(ymd(resolveMemoDate({ kind: "fixed", month: 10, day: 15 }, 2026))).toBe("2026-10-15");
    expect(ymd(resolveMemoDate({ kind: "fixed", month: 2, day: 29 }, 2027))).toBe("2027-02-28");
  });

  it("относительно Пасхи", () => {
    // Пасха 2026 - 12 апреля, +70 дней - 21 июня
    expect(ymd(resolveMemoDate({ kind: "easter", offset: 70 }, 2026))).toBe("2026-06-21");
    expect(ymd(resolveMemoDate({ kind: "easter", offset: -9 }, 2026))).toBe("2026-04-03");
  });

  it("воскресенье ближайшее, после и до даты", () => {
    // 7 февраля 2026 - суббота, ближайшее воскресенье - 8 февраля
    expect(ymd(resolveMemoDate(parseMemoTemplate("SU~0207")!, 2026))).toBe("2026-02-08");
    // 7 февраля 2027 - воскресенье
    expect(ymd(resolveMemoDate(parseMemoTemplate("SU~0207")!, 2027))).toBe("2027-02-07");
    // 11 февраля 2026 - среда: воскресенье после - 15 февраля, до - 8 февраля
    expect(ymd(resolveMemoDate(parseMemoTemplate("SU>0211")!, 2026))).toBe("2026-02-15");
    expect(ymd(resolveMemoDate(parseMemoTemplate("SU<0211")!, 2026))).toBe("2026-02-08");
    // Если дата сама воскресенье - берётся соседнее воскресенье
    expect(ymd(resolveMemoDate(parseMemoTemplate("SU>0207")!, 2027))).toBe("2027-02-14");
    expect(ymd(resolveMemoDate(parseMemoTemplate("SU<0207")!, 2027))).toBe("2027-01-31");
  });

  it("суббота после даты", () => {
    // 11 февраля 2026 - среда, суббота после - 14 февраля
    expect(ymd(resolveMemoDate(parseMemoTemplate("SA>0211")!, 2026))).toBe("2026-02-14");
  });
});

describe("nextMemoDate", () => {
  const rule = parseMemoTemplate("Y1015")!;

  it("в этом году, если дата ещё впереди или сегодня", () => {
    expect(ymd(nextMemoDate(rule, new Date(2026, 9, 14)))).toBe("2026-10-15");
    expect(ymd(nextMemoDate(rule, new Date(2026, 9, 15, 18, 30)))).toBe("2026-10-15");
  });

  it("в следующем году, если дата прошла", () => {
    expect(ymd(nextMemoDate(rule, new Date(2026, 9, 16)))).toBe("2027-10-15");
  });
});

describe("formatMemoDate / buildMemoDay", () => {
  it("подпись «старый стиль / новый стиль»", () => {
    expect(formatMemoDate(new Date(2026, 1, 7))).toBe("25 января / 7 февраля");
  });

  it("собирает день памяти с кодом дня календаря", () => {
    expect(
      buildMemoDay(
        { date_template: "Y1015", description: "", is_relative: false },
        new Date(2026, 9, 1)
      )
    ).toEqual({ code: "20261015", label: "2 октября / 15 октября", description: "", isRelative: false });
  });

  it("пропускает неизвестный шаблон", () => {
    expect(buildMemoDay({ date_template: "?", description: "", is_relative: false })).toBeNull();
  });
});

describe("getServiceDateLabel", () => {
  it("строит подпись по разделам Минеи", () => {
    expect(getServiceDateLabel("Во 2-й день", "Октябрь")).toBe("2 октября / 15 октября");
    expect(getServiceDateLabel("Во 25-й день", "Январь")).toBe("25 января / 7 февраля");
  });

  it("возвращает null, если разделы не распознаны", () => {
    expect(getServiceDateLabel("Общие службы", "Октябрь")).toBeNull();
    expect(getServiceDateLabel("Во 2-й день", undefined)).toBeNull();
    expect(getServiceDateLabel("Во 30-й день", "Февраль")).toBeNull();
  });
});
