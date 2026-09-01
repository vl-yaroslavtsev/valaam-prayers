import { describe, expect, it } from "vitest";
import { daysApi } from "@/services/api/DaysApi";
import { fetchUrl, stubJsonFetch } from "@/test/helpers";

const listData = {
  items: [],
  nav: { page_count: 1, page_num: 1, page_size: 10, record_count: 0, nav_num: 1 },
};

describe("DaysApi", () => {
  describe("getDaysCount", () => {
    it("строит URL с from_date, to_date и modified_since", async () => {
      const since = new Date("2026-02-01T00:00:00.000Z");
      const fetchMock = stubJsonFetch({ count: 2, size: 10 });

      await daysApi.getDaysCount("20260101", "20260131", since);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/days/count");
      expect(url.searchParams.get("from_date")).toBe("20260101");
      expect(url.searchParams.get("to_date")).toBe("20260131");
      expect(url.searchParams.get("modified_since")).toBe(String(Math.floor(since.getTime() / 1000)));
    });
  });

  describe("getDaysPage", () => {
    it("строит URL /days/list с from_date, to_date, page и page_size", async () => {
      const fetchMock = stubJsonFetch(listData);

      await daysApi.getDaysPage("20260101", "20261231", 2, 50);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/days/list");
      expect(url.searchParams.get("from_date")).toBe("20260101");
      expect(url.searchParams.get("to_date")).toBe("20261231");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("page_size")).toBe("50");
    });
  });

  describe("getDaysIconsCount", () => {
    it("строит URL с from_date, to_date, image_size и modified_since", async () => {
      const since = new Date("2026-04-01T00:00:00.000Z");
      const fetchMock = stubJsonFetch({ count: 1, size: 5 });

      await daysApi.getDaysIconsCount("20260101", "20260131", "m", since);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/days/icons/count");
      expect(url.searchParams.get("from_date")).toBe("20260101");
      expect(url.searchParams.get("to_date")).toBe("20260131");
      expect(url.searchParams.get("image_size")).toBe("m");
      expect(url.searchParams.get("modified_since")).toBe(String(Math.floor(since.getTime() / 1000)));
    });
  });

  describe("getDaysIconsPage", () => {
    it("строит URL /days/icons с from_date, to_date, image_size, page и page_size", async () => {
      const fetchMock = stubJsonFetch(listData);

      await daysApi.getDaysIconsPage("20260101", "20260131", "s", 4, 25);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/days/icons");
      expect(url.searchParams.get("from_date")).toBe("20260101");
      expect(url.searchParams.get("to_date")).toBe("20260131");
      expect(url.searchParams.get("image_size")).toBe("s");
      expect(url.searchParams.get("page")).toBe("4");
      expect(url.searchParams.get("page_size")).toBe("25");
    });
  });
});
