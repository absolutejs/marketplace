import { describe, expect, test } from "bun:test";
import {
  applyAntiSnipe, assertMarketTransition, criteriaFromAsset, decodeMarketCursor, encodeMarketCursor,
  matchesAssetCriteria, minimumNextBid, normalizeAuctionDraft, planSaleSettlement,
} from "../src/index";

describe("marketplace primitives", () => {
  const asset = { id: "pet:1", printingId: "genesis:owl:holo", subjectId: "owl", finish: "Holo", material: "Gold", colorway: "Blue", pattern: "Circuit", serialNumber: 7 };
  test("builds and matches criteria", () => {
    const criteria = criteriaFromAsset(asset, "exact", 10);
    expect(matchesAssetCriteria(asset, criteria)).toBe(true);
    expect(matchesAssetCriteria({ ...asset, serialNumber: 11 }, criteria)).toBe(false);
    expect(matchesAssetCriteria({ ...asset, material: "Chrome" }, criteria)).toBe(false);
  });
  test("round trips opaque cursors", () => {
    const cursor = { at: "2026-07-15T00:00:00.000Z", id: "listing:1" };
    expect(decodeMarketCursor(encodeMarketCursor(cursor))).toEqual(cursor);
    expect(decodeMarketCursor("not-a-cursor")).toBeNull();
  });
  test("plans a balanced seller-paid settlement", () => {
    const plan = planSaleSettlement({ idempotencyKey: "sale:1", assetId: "pet:1", sellerAccountId: "seller", buyerAccountId: "buyer", platformAccountId: "platform", grossCents: 10_00 });
    expect(plan.sellerNetCents).toBe(900);
    expect(plan.feeCents).toBe(100);
    expect(plan.entries.reduce((sum, row) => sum + row.amountCents, 0)).toBe(0);
  });
  test("enforces state transitions", () => {
    expect(assertMarketTransition("active", "settling")).toBe("settling");
    expect(() => assertMarketTransition("settled", "active")).toThrow();
  });
  test("extends bids placed in the final two minutes", () => {
    const end = new Date("2026-07-15T00:02:00.000Z");
    const result = applyAntiSnipe(end, new Date("2026-07-15T00:01:00.000Z"), 0);
    expect(result.extended).toBe(true);
    expect(result.endsAt.toISOString()).toBe("2026-07-15T00:04:00.000Z");
    expect(minimumNextBid(500, 900)).toBe(1_000);
  });
  test("normalizes auction bounds", () => {
    expect(normalizeAuctionDraft({ assetId: "pet:1", startCents: 500, durationHours: 24 }, new Date(0)).endsAt.getTime()).toBe(86_400_000);
    expect(() => normalizeAuctionDraft({ assetId: "pet:1", startCents: 50, durationHours: 24 })).toThrow();
  });
});
