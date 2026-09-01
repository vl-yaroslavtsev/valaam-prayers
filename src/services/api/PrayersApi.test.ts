import { describe, expect, it } from "vitest";
import { prayersApi } from "@/services/api/PrayersApi";
import { fetchUrl, stubJsonFetch } from "@/test/helpers";

const listData = {
  items: [],
  nav: { page_count: 1, page_num: 1, page_size: 10, record_count: 0, nav_num: 1 },
};

describe("PrayersApi", () => {
  describe("getPrayersCount", () => {
    it("строит URL с section_id и modified_since", async () => {
      const since = new Date("2026-05-01T00:00:00.000Z");
      const fetchMock = stubJsonFetch({ count: 3, size: 9 });

      await prayersApi.getPrayersCount(842, since);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/prayers/count");
      expect(url.searchParams.get("section_id")).toBe("842");
      expect(url.searchParams.get("modified_since")).toBe(String(Math.floor(since.getTime() / 1000)));
    });
  });

  describe("getPrayersPage", () => {
    it("строит URL /prayers/list с section_id, page и page_size", async () => {
      const fetchMock = stubJsonFetch(listData);

      await prayersApi.getPrayersPage(842, 3, 100);

      const url = fetchUrl(fetchMock);
      expect(url.pathname).toBe("/api/prayers/list");
      expect(url.searchParams.get("section_id")).toBe("842");
      expect(url.searchParams.get("page")).toBe("3");
      expect(url.searchParams.get("page_size")).toBe("100");
    });
  });
});
