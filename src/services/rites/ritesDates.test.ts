import { describe, expect, it } from "vitest";
import type { Rite, RiteType, TypeRestriction } from "@/services/rites/ritesApi";
import {
  calculateMinDate,
  dayTsToWallDate,
  findDateFixes,
  findNextValidDate,
  formatDateLong,
  formatDateParam,
  getToDate,
  isValidDate,
  mskDayStart,
  mskWeekDay,
  wallDateToDayTs,
} from "@/services/rites/ritesDates";

const DAY = 86400;
/** Начало дня по Москве */
const msk = (year: number, month: number, day: number): number =>
  Date.UTC(year, month - 1, day) / 1000 - 3 * 3600;

const makeType = (overrides: Partial<RiteType> = {}): RiteType => ({
  id: 1,
  active: true,
  code: "",
  typeName: "О здравии",
  name: "О здравии - Разовое поминовение (1 день)",
  shortName: "Разовое поминовение",
  type: "health",
  price: 10,
  minPrice: 1,
  processing: 1,
  postPeriod: 0,
  period: "1day",
  periodDays: 1,
  disabled: false,
  weekDays: [],
  notificationDays: 7,
  description: "",
  ...overrides,
});

const makeRite = (id: number, type: RiteType, fromTs: number): Rite => ({
  id,
  number: String(id),
  names: [{ name: "Иван", explanation: "" }],
  type,
  sum: 10,
  period: { from: { ts: fromTs, value: "" }, to: { ts: getToDate(fromTs, type), value: "" } },
});

// 5 ноября 2026, 23:30 по Москве
const NOW = msk(2026, 11, 5) + 23.5 * 3600;

describe("ritesDates", () => {
  it("день и день недели считаются по Москве", () => {
    // Граница суток МСК: 20:59:59 UTC — ещё 5 ноября, 21:00:00 UTC — уже 6 ноября
    expect(mskDayStart(Date.UTC(2026, 10, 5, 20, 59, 59) / 1000)).toBe(msk(2026, 11, 5));
    expect(mskDayStart(Date.UTC(2026, 10, 5, 21, 0, 0) / 1000)).toBe(msk(2026, 11, 6));
    expect(mskWeekDay(msk(2026, 11, 5))).toBe(4); // четверг
    expect(mskWeekDay(msk(2026, 11, 8))).toBe(7); // воскресенье
    expect(mskWeekDay(msk(2026, 11, 9))).toBe(1); // понедельник
  });

  it("форматирует даты", () => {
    expect(formatDateLong(msk(2026, 11, 5))).toBe("5 ноября 2026");
    expect(formatDateParam(msk(2026, 11, 5))).toBe("05.11.2026");
  });

  it("минимальная дата это сегодня плюс дни обработки и ещё один", () => {
    expect(calculateMinDate(NOW, makeType({ processing: 1 }))).toBe(msk(2026, 11, 7));
    expect(calculateMinDate(NOW, makeType({ processing: 2 }))).toBe(msk(2026, 11, 8));
  });

  it("конец периода: начало плюс дни периода минус один; при periodDays=0 — один день", () => {
    const start = msk(2026, 11, 7);
    expect(getToDate(start, makeType({ periodDays: 1 }))).toBe(start);
    expect(getToDate(start, makeType({ periodDays: 0 }))).toBe(start);
    expect(getToDate(start, makeType({ periodDays: 40 }))).toBe(start + 39 * DAY);
  });

  it("конец годового периода: плюс год минус день по календарю", () => {
    const year = makeType({ periodDays: 365, period: "1year" });
    expect(getToDate(msk(2026, 11, 7), year)).toBe(msk(2027, 11, 6));
    // через високосный день год всё равно кончается накануне той же даты
    expect(getToDate(msk(2027, 3, 1), year)).toBe(msk(2028, 2, 29));
    // начало 29 февраля високосного года → окончание 28 февраля следующего
    expect(getToDate(msk(2028, 2, 29), year)).toBe(msk(2029, 2, 28));
  });

  it("день из календаря F7 и день по Москве переводятся друг в друга", () => {
    const wall = dayTsToWallDate(msk(2026, 11, 7));
    expect([wall.getFullYear(), wall.getMonth(), wall.getDate()]).toEqual([2026, 10, 7]);
    expect(wallDateToDayTs(wall)).toBe(msk(2026, 11, 7));
  });

  it("учитывает дни недели типа", () => {
    const saturdayOnly = makeType({ weekDays: [6] });
    expect(isValidDate(msk(2026, 11, 7), saturdayOnly, [])).toBe(true);
    expect(isValidDate(msk(2026, 11, 8), saturdayOnly, [])).toBe(false);
    expect(findNextValidDate(msk(2026, 11, 8), saturdayOnly, [])).toBe(msk(2026, 11, 14));
  });

  it("запрет перекрывает день, разрешение перекрывает запрет; чужие типы не влияют", () => {
    const type = makeType();
    const day = msk(2026, 11, 10);
    const range = (kind: TypeRestriction["type"], rites: number[]): TypeRestriction => ({
      type: kind,
      from: day,
      to: day + DAY - 1,
      rites,
    });

    expect(isValidDate(day, type, [range("disallow", [1])])).toBe(false);
    expect(isValidDate(day, type, [range("disallow", [2])])).toBe(true);
    expect(isValidDate(day, type, [range("disallow", [1]), range("allow", [1])])).toBe(true);
    expect(findNextValidDate(day, type, [range("disallow", [1])])).toBe(day + DAY);
  });

  describe("findDateFixes", () => {
    it("пересчитывает дату, ушедшую в прошлое", () => {
      const type = makeType({ processing: 1 });
      const [fix] = findDateFixes([makeRite(1, type, msk(2026, 11, 5))], [], NOW);

      expect(fix.rite.id).toBe(1);
      expect(fix.from).toEqual({ ts: msk(2026, 11, 7), value: "7 ноября 2026" });
      expect(fix.to).toEqual({ ts: msk(2026, 11, 7), value: "7 ноября 2026" });
    });

    it("период сорокоуста сдвигается вместе с началом", () => {
      const type = makeType({ processing: 2, periodDays: 40, period: "40days" });
      const [fix] = findDateFixes([makeRite(1, type, msk(2026, 11, 1))], [], NOW);

      expect(fix.from.ts).toBe(msk(2026, 11, 8));
      expect(fix.to.ts).toBe(msk(2026, 11, 8) + 39 * DAY);
    });

    it("не трогает актуальные записки и записки без типа или даты", () => {
      const type = makeType();
      const valid = makeRite(1, type, msk(2026, 11, 7));
      const noType = { ...makeRite(2, type, msk(2026, 11, 1)), type: null };
      const noDate: Rite = { ...makeRite(3, type, 0), period: { from: null, to: null } };

      expect(findDateFixes([valid, noType, noDate], [], NOW)).toEqual([]);
    });

    it("переносит записку с недопустимого дня недели на ближайший допустимый", () => {
      const type = makeType({ weekDays: [1] });
      // 10 ноября вторник: дата в будущем, но молебен только по понедельникам
      const [fix] = findDateFixes([makeRite(1, type, msk(2026, 11, 10))], [], NOW);

      expect(fix.from.ts).toBe(msk(2026, 11, 9));
    });

    it("если нет допустимых дат за 800 дней, findNextValidDate возвращает null, а findDateFixes пропускает записку", () => {
      const type = makeType();
      const blockAll: TypeRestriction = {
        type: "disallow",
        from: msk(2026, 1, 1),
        to: msk(2030, 1, 1),
        rites: [1],
      };

      expect(findNextValidDate(msk(2026, 11, 7), type, [blockAll])).toBeNull();
      expect(findDateFixes([makeRite(1, type, msk(2026, 11, 5))], [blockAll], NOW)).toEqual([]);
    });
  });
});
