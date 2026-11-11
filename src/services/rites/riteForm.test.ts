import { describe, expect, it } from "vitest";
import type { RiteType } from "@/services/rites/ritesApi";
import {
  buildNames,
  buildPriceList,
  calculateDonate,
  filterByPrefix,
  findExplanation,
  formatNoteRow,
  mapServerErrors,
  minimumDonate,
  parseDonate,
  pickTypeForKind,
  recommendedDonate,
  splitPrefix,
  externalMailLinks,
  prepareDescription,
  validateDonate,
  validateDonateAmount,
  validateExplanation,
  validateName,
  validateRow,
  EXPLANATION_ERROR,
  NAME_ERROR,
} from "@/services/rites/riteForm";

const makeType = (overrides: Partial<RiteType>): RiteType => ({
  id: 1,
  active: true,
  code: "",
  typeName: "О здравии",
  name: "",
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

const EXPLANATIONS = ["младенца", "воина", "игумена с братией"];

describe("riteForm", () => {
  it("имя: только буквы без пробелов, пустое не ошибка", () => {
    expect(validateName("")).toBeNull();
    expect(validateName("Василия")).toBeNull();
    expect(validateName("ёлена")).toBeNull();
    expect(validateName("Мария Петровна")).toBe(NAME_ERROR);
    expect(validateName("Иван1")).toBe(NAME_ERROR);
    expect(validateName("Анна-Мария")).toBe(NAME_ERROR);
  });

  it("пометка берётся из списка без учёта регистра", () => {
    expect(findExplanation("ВОИНА", EXPLANATIONS)).toBe("воина");
    expect(validateExplanation("", EXPLANATIONS)).toBeNull();
    expect(validateExplanation("воина", EXPLANATIONS)).toBeNull();
    expect(validateExplanation("воин", EXPLANATIONS)?.short).toBe("Выберите из списка");
  });

  it("сумма: берутся цифры, должна быть больше нуля", () => {
    expect(parseDonate("5 400 ₽")).toBe(5400);
    expect(parseDonate("")).toBe(0);
    expect(validateDonate(0)).not.toBeNull();
    expect(validateDonate(10)).toBeNull();
  });

  it("рекомендуемая сумма: цена типа за каждое верное имя", () => {
    const type = makeType({ price: 500 });
    expect(calculateDonate(["Иван", "", "Мария Петровна", "Анна"], type)).toBe(1000);
    expect(calculateDonate(["Иван"], null)).toBe(0);
  });

  it("пометка без имени — ошибка имени, пустая строка — нет", () => {
    expect(validateRow({ name: "", explanation: "" }, EXPLANATIONS)).toEqual({
      name: null,
      explanation: null,
    });
    expect(validateRow({ name: "", explanation: "воина" }, EXPLANATIONS).name?.short).toBe("Укажите имя");
    expect(validateRow({ name: "Иван1", explanation: "нет" }, EXPLANATIONS)).toEqual({
      name: NAME_ERROR,
      explanation: EXPLANATION_ERROR,
    });
    expect(formatNoteRow({ name: "Наталии", explanation: "послушницы" })).toBe("послушницы Наталии");
  });

  it("в сумму входят только строки без ошибок", () => {
    const type = makeType({ price: 500, minPrice: 100 });
    const rows = [
      { name: "Иван", explanation: "воина" },
      { name: "Мария Петровна", explanation: "" },
      { name: "", explanation: "младенца" },
      { name: "Анна", explanation: "" },
    ];
    expect(recommendedDonate(rows, EXPLANATIONS, type)).toBe(1000);
    expect(minimumDonate(rows, EXPLANATIONS, type)).toBe(200);
    expect(recommendedDonate(rows, EXPLANATIONS, null)).toBe(0);
  });

  it("сумма меньше минимальной отличается от нулевой", () => {
    expect(validateDonateAmount(0, 100)?.short).toBe("Сумма должна быть больше 0");
    expect(validateDonateAmount(50, 100)?.short).toBe("Сумма меньше минимальной");
    expect(validateDonateAmount(100, 100)).toBeNull();
  });

  it("префикс подсказки отделяется без учёта регистра", () => {
    expect(splitPrefix("послушника", "по")).toEqual({ match: "по", rest: "слушника" });
    expect(splitPrefix("воина", "")).toEqual({ match: "", rest: "воина" });
  });

  it("запрос содержит все строки, пометка в написании списка", () => {
    expect(
      buildNames(
        [
          { name: " Иван ", explanation: "ВОИНА" },
          { name: "", explanation: "" },
        ],
        EXPLANATIONS,
      ),
    ).toEqual([
      { name: "Иван", explanation: "воина" },
      { name: "", explanation: "" },
    ]);
  });

  it("подсказки имён по началу, без учёта регистра и с лимитом", () => {
    const names = ["Авель", "Авраам", "Августин", "Борис"];
    expect(filterByPrefix(names, "ав", 2)).toEqual(["Авель", "Авраам"]);
    expect(filterByPrefix(names, "", 5)).toEqual([]);
    expect(filterByPrefix(names, "я", 5)).toEqual([]);
  });

  describe("ошибки сервера", () => {
    it("ошибки полей получают короткий текст, остальные идут в общие", () => {
      const result = mapServerErrors([
        { code: "badName", field: "name-2", description: "Имя слишком длинное" },
        { code: "donateLower", field: "donate", description: "Сумма меньше рекомендуемой" },
        { code: "badDate", field: "date", description: "Неверная дата" },
        { code: "internal", description: "Система недоступна" },
      ]);

      expect(result.fields["name-2"]).toEqual({
        short: "Неверное имя",
        full: "Имя слишком длинное",
      });
      expect(result.fields.donate.short).toBe("Сумма меньше минимальной");
      expect(result.fields.donate.full).toBe("Сумма меньше рекомендуемой");
      expect(result.general).toEqual(["Неверная дата", "Система недоступна"]);
    });

    it("поле без известного кода тоже не теряется", () => {
      const result = mapServerErrors([
        { code: "unknown", field: "name-0", description: "Что-то не так" },
      ]);
      expect(result.fields).toEqual({});
      expect(result.general).toEqual(["Что-то не так"]);
    });
  });

  describe("типы записок", () => {
    const types = [
      makeType({ id: 1, shortName: "Разовое поминовение" }),
      makeType({ id: 2, shortName: "Псалтирь (1 год)", price: 2000 }),
      makeType({ id: 3, type: "repose", shortName: "Разовое поминовение" }),
      makeType({ id: 4, type: "repose", shortName: "Панихида (1 день)" }),
      makeType({ id: 5, type: "repose", shortName: "Скрытый", disabled: true }),
    ];

    it("при смене вида остаётся тот же подтип, если он есть", () => {
      expect(pickTypeForKind(types, "repose", types[0])?.id).toBe(3);
    });

    it("если такого подтипа нет, берётся первый", () => {
      expect(pickTypeForKind(types, "repose", types[1])?.id).toBe(3);
      expect(pickTypeForKind(types, "repose", null)?.id).toBe(3);
    });

    it("прайс-лист без отключённых типов", () => {
      expect(buildPriceList(types, "repose").map((item) => item.name)).toEqual([
        "Разовое поминовение",
        "Панихида (1 день)",
      ]);
      expect(buildPriceList(types, "health")[1]).toEqual({ name: "Псалтирь (1 год)", price: 2000 });
    });
  });

  it("почтовая ссылка получает класс external", () => {
    const html = "напишите на <b><a href='mailto:rites@valaam.ru' target='_blank'>rites@valaam.ru</a></b>";
    expect(externalMailLinks(html)).toBe(
      "напишите на <b><a class=\"external\" href='mailto:rites@valaam.ru' target='_blank'>rites@valaam.ru</a></b>",
    );
    expect(externalMailLinks('<a class="link" href="mailto:a@b.c">a</a>')).toBe(
      '<a class="external link" href="mailto:a@b.c">a</a>',
    );
    expect(externalMailLinks('<a href="https://valaam.ru">сайт</a>')).toBe(
      '<a href="https://valaam.ru">сайт</a>',
    );
  });

  it("описание: ссылки абсолютные, иконки убраны", () => {
    const html =
      'Текст. <a href="/publishing/7894/#a" target="_blank">Подробнее <i class="fa fa-angle-double-right"></i></a>';
    expect(prepareDescription(html, "https://dev.valaam.ru")).toBe(
      'Текст. <a href="https://dev.valaam.ru/publishing/7894/#a" target="_blank">Подробнее </a>',
    );
  });
});
