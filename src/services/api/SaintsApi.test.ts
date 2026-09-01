import { describe, expect, it } from "vitest";
import { saintsApi } from "@/services/api/SaintsApi";
import { fetchUrl, stubJsonFetch } from "@/test/helpers";

const listData = {
  items: [],
  nav: { page_count: 1, page_num: 1, page_size: 10, record_count: 0, nav_num: 1 },
};

describe("SaintsApi", () => {
  describe("getSaintsCount", () => {
    it("строит URL /saints/count с modified_since", async () => {
      const since = new Date("2026-06-01T00:00:00.000Z");
      const fetchMock = stubJsonFetch({ count: 4, size: 8 });

      await saintsApi.getSaintsCount(since);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/saints/count");
      expect(url.searchParams.get("modified_since")).toBe(String(Math.floor(since.getTime() / 1000)));
    });
  });

  describe("getSaintsPage", () => {
    it("строит URL /saints/list с page и page_size", async () => {
      const fetchMock = stubJsonFetch(listData);

      await saintsApi.getSaintsPage(5, 80);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/saints/list");
      expect(url.searchParams.get("page")).toBe("5");
      expect(url.searchParams.get("page_size")).toBe("80");
    });
  });

  describe("getSaintsIconsCount", () => {
    it("строит URL с image_size и modified_since", async () => {
      const since = new Date("2026-07-01T00:00:00.000Z");
      const fetchMock = stubJsonFetch({ count: 1, size: 2 });

      await saintsApi.getSaintsIconsCount("m", since);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/saints/icons/count");
      expect(url.searchParams.get("image_size")).toBe("m");
      expect(url.searchParams.get("modified_since")).toBe(String(Math.floor(since.getTime() / 1000)));
    });
  });

  describe("getSaintsIconsPage", () => {
    it("строит URL /saints/icons с image_size, page и page_size", async () => {
      const fetchMock = stubJsonFetch(listData);

      await saintsApi.getSaintsIconsPage("s", 2, 40);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/saints/icons");
      expect(url.searchParams.get("image_size")).toBe("s");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("page_size")).toBe("40");
    });
  });
});
