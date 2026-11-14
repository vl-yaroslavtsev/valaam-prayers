import { beforeEach, describe, expect, it } from "vitest";
import { readSuggestionUsage, rememberSuggestion } from "@/services/rites/suggestionUsage";

describe("suggestionUsage", () => {
  beforeEach(() => localStorage.clear());

  it("считает повторный ввод без учёта регистра и пробелов", () => {
    rememberSuggestion("names", "Елены");
    const usage = rememberSuggestion("names", "  елены ");
    expect(usage.names.ЕЛЕНЫ).toBe(2);
    expect(readSuggestionUsage().names.ЕЛЕНЫ).toBe(2);
  });

  it("пустую строку не запоминает", () => {
    expect(rememberSuggestion("explanations", "   ").explanations).toEqual({});
  });

  it("битые данные не мешают новому вводу", () => {
    localStorage.setItem("rite-suggestion-usage", "{");
    expect(rememberSuggestion("explanations", "воина").explanations.ВОИНА).toBe(1);
  });
});
