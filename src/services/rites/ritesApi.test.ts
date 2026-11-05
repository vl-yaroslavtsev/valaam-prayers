import { describe, expect, it } from "vitest";
import { collectErrors, toErrorList } from "@/services/rites/ritesApi";

describe("разбор ошибок сервера", () => {
  const error = { code: "internal", description: "Система недоступна" };

  it("массив ошибок", () => {
    expect(toErrorList([error])).toEqual([error]);
  });

  it("одна ошибка объектом (так отвечают add и addManual)", () => {
    expect(toErrorList(error)).toEqual([error]);
  });

  it("объект со списком ошибок", () => {
    expect(toErrorList({ 0: error })).toEqual([error]);
  });

  it("пустые значения", () => {
    expect(toErrorList(undefined)).toEqual([]);
    expect(toErrorList([])).toEqual([]);
  });

  it("сначала ошибки полей, затем общие", () => {
    const field = { code: "badEmail", field: "email", description: "Неверный email" };
    expect(collectErrors({ fullErrors: [error], fieldsErrors: [field] })).toEqual([field, error]);
    expect(collectErrors(null)).toEqual([]);
  });
});
