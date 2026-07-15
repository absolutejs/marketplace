import { cents, sellerFee, steamLikeWalletPolicy, type Cents, type WalletPolicy } from "@absolutejs/wallet";

export type MarketplacePolicy = {
  wallet: WalletPolicy;
  minimumListingCents: Cents;
  minimumBidIncrementCents: Cents;
  maximumActiveListings: number;
  maximumActiveBuyOrders: number;
  maximumActiveAuctions: number;
  maximumTradeAssetsPerSide: number;
  maximumOrderDays: number;
  maximumAuctionHours: number;
  antiSnipeWindowMs: number;
  antiSnipeExtensionMs: number;
  maximumAuctionExtensions: number;
};

export const steamLikeMarketplacePolicy: MarketplacePolicy = {
  wallet: steamLikeWalletPolicy,
  minimumListingCents: 100,
  minimumBidIncrementCents: 100,
  maximumActiveListings: 50,
  maximumActiveBuyOrders: 20,
  maximumActiveAuctions: 10,
  maximumTradeAssetsPerSide: 10,
  maximumOrderDays: 30,
  maximumAuctionHours: 168,
  antiSnipeWindowMs: 120_000,
  antiSnipeExtensionMs: 120_000,
  maximumAuctionExtensions: 30,
};

export type MarketAsset = {
  id: string;
  printingId?: string | null;
  subjectId?: string | null;
  finish?: string | null;
  material?: string | null;
  colorway?: string | null;
  pattern?: string | null;
  serialNumber?: number | null;
  traits?: Record<string, string | number | boolean | null | undefined>;
};

export type AssetCriteria = {
  assetId?: string;
  printingId?: string;
  subjectId?: string;
  finish?: string;
  material?: string;
  colorway?: string;
  pattern?: string;
  maximumSerial?: number;
  traits?: Record<string, string | number | boolean>;
};

export type CriteriaPrecision = "printing" | "finish" | "exact";

export const criteriaFromAsset = (asset: MarketAsset, precision: CriteriaPrecision = "printing", maximumSerial?: number): AssetCriteria => {
  if (!asset.printingId) throw new Error("asset does not belong to a printing");
  const criteria: AssetCriteria = { printingId: asset.printingId, subjectId: asset.subjectId ?? undefined };
  if (precision === "finish" || precision === "exact") criteria.finish = asset.finish ?? undefined;
  if (precision === "exact") {
    criteria.material = asset.material ?? undefined;
    criteria.colorway = asset.colorway ?? undefined;
    criteria.pattern = asset.pattern ?? undefined;
  }
  if (Number.isSafeInteger(maximumSerial) && Number(maximumSerial) > 0) criteria.maximumSerial = Number(maximumSerial);
  return criteria;
};

export const matchesAssetCriteria = (asset: MarketAsset, criteria: AssetCriteria): boolean => {
  if (criteria.assetId && asset.id !== criteria.assetId) return false;
  if (criteria.printingId && asset.printingId !== criteria.printingId) return false;
  if (criteria.subjectId && asset.subjectId !== criteria.subjectId) return false;
  if (criteria.finish && asset.finish !== criteria.finish) return false;
  if (criteria.material && asset.material !== criteria.material) return false;
  if (criteria.colorway && asset.colorway !== criteria.colorway) return false;
  if (criteria.pattern && asset.pattern !== criteria.pattern) return false;
  if (criteria.maximumSerial && (!asset.serialNumber || asset.serialNumber > criteria.maximumSerial)) return false;
  for (const [key, value] of Object.entries(criteria.traits ?? {})) if (asset.traits?.[key] !== value) return false;
  return true;
};

const boundedInteger = (value: unknown, label: string, minimum: number, maximum: number) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  return parsed;
};

export const assertMarketAmount = (value: unknown, label = "amount", policy = steamLikeMarketplacePolicy): Cents => {
  const amount = cents(Number(value), label);
  if (amount < policy.minimumListingCents || amount > policy.wallet.maximumTransactionCents) {
    throw new Error(`${label} must be between ${policy.minimumListingCents} and ${policy.wallet.maximumTransactionCents} cents`);
  }
  return amount;
};

export const assertIdempotencyKey = (value: unknown) => {
  const key = String(value ?? "").trim();
  if (!key || key.length > 200) throw new Error("a valid idempotency key is required");
  return key;
};

export const normalizeListingDraft = (raw: unknown, policy = steamLikeMarketplacePolicy) => {
  const input = (raw ?? {}) as { assetId?: unknown; priceCents?: unknown; expiresAt?: unknown };
  const assetId = String(input.assetId ?? "").trim();
  if (!assetId) throw new Error("asset is required");
  const priceCents = assertMarketAmount(input.priceCents, "listing price", policy);
  const expiresAt = typeof input.expiresAt === "string" && !Number.isNaN(Date.parse(input.expiresAt)) ? new Date(input.expiresAt) : null;
  return { assetId, priceCents, expiresAt, fee: sellerFee(priceCents, policy.wallet.sellerFeeBps) };
};

export const normalizeOrderDuration = (days: unknown, policy = steamLikeMarketplacePolicy) =>
  boundedInteger(days ?? 7, "order duration", 1, policy.maximumOrderDays);

export const normalizeAuctionDraft = (raw: unknown, now = new Date(), policy = steamLikeMarketplacePolicy) => {
  const input = (raw ?? {}) as { assetId?: unknown; startCents?: unknown; reserveCents?: unknown; durationHours?: unknown };
  const assetId = String(input.assetId ?? "").trim();
  if (!assetId) throw new Error("asset is required");
  const startCents = assertMarketAmount(input.startCents, "auction start", policy);
  const reserveRaw = Number(input.reserveCents);
  const reserveCents = Number.isSafeInteger(reserveRaw) && reserveRaw > 0 ? assertMarketAmount(reserveRaw, "auction reserve", policy) : null;
  const durationHours = boundedInteger(input.durationHours ?? 24, "auction duration", 1, policy.maximumAuctionHours);
  return { assetId, startCents, reserveCents, durationHours, endsAt: new Date(now.getTime() + durationHours * 3_600_000) };
};

export const minimumNextBid = (startCents: Cents, leadingBidCents: Cents | null | undefined, policy = steamLikeMarketplacePolicy) =>
  leadingBidCents == null ? startCents : leadingBidCents + policy.minimumBidIncrementCents;

export const applyAntiSnipe = (endsAt: Date, bidAt: Date, extensionCount: number, policy = steamLikeMarketplacePolicy) => {
  if (extensionCount >= policy.maximumAuctionExtensions || endsAt.getTime() - bidAt.getTime() > policy.antiSnipeWindowMs) {
    return { endsAt, extensionCount, extended: false };
  }
  return { endsAt: new Date(Math.max(endsAt.getTime(), bidAt.getTime()) + policy.antiSnipeExtensionMs), extensionCount: extensionCount + 1, extended: true };
};

export type MarketCursor = { at: string; id: string };
export const encodeMarketCursor = (value: MarketCursor) => Buffer.from(JSON.stringify(value)).toString("base64url");
export const decodeMarketCursor = (raw: unknown): MarketCursor | null => {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as MarketCursor;
    return typeof value.at === "string" && !Number.isNaN(Date.parse(value.at)) && typeof value.id === "string" && value.id.length > 0 ? value : null;
  } catch { return null; }
};

export type MarketEntityKind = "listing" | "buy-order" | "auction" | "trade";
export type MarketStatus = "draft" | "active" | "pending" | "settling" | "settled" | "cancelled" | "expired" | "declined" | "failed";
const transitions: Record<MarketStatus, readonly MarketStatus[]> = {
  draft: ["active", "cancelled"], active: ["pending", "settling", "cancelled", "expired"], pending: ["active", "settling", "cancelled", "declined", "expired"],
  settling: ["settled", "failed"], failed: ["settling", "cancelled"], settled: [], cancelled: [], expired: [], declined: [],
};
export const assertMarketTransition = (from: MarketStatus, to: MarketStatus) => {
  if (!transitions[from].includes(to)) throw new Error(`invalid marketplace transition: ${from} -> ${to}`);
  return to;
};

export type SaleSettlementPlan = {
  idempotencyKey: string;
  assetId: string;
  sellerAccountId: string;
  buyerAccountId: string;
  platformAccountId: string;
  grossCents: Cents;
  sellerNetCents: Cents;
  feeCents: Cents;
  entries: { accountId: string; amountCents: Cents }[];
};

export const planSaleSettlement = (input: Omit<SaleSettlementPlan, "sellerNetCents" | "feeCents" | "entries">, policy = steamLikeMarketplacePolicy): SaleSettlementPlan => {
  const idempotencyKey = assertIdempotencyKey(input.idempotencyKey);
  const grossCents = assertMarketAmount(input.grossCents, "sale price", policy);
  if (input.sellerAccountId === input.buyerAccountId) throw new Error("buyer and seller must be different accounts");
  const fee = sellerFee(grossCents, policy.wallet.sellerFeeBps);
  return { idempotencyKey, assetId: input.assetId, sellerAccountId: input.sellerAccountId, buyerAccountId: input.buyerAccountId, platformAccountId: input.platformAccountId, grossCents, feeCents: fee.feeCents, sellerNetCents: fee.sellerNetCents, entries: [
    { accountId: input.buyerAccountId, amountCents: -grossCents },
    { accountId: input.sellerAccountId, amountCents: fee.sellerNetCents },
    { accountId: input.platformAccountId, amountCents: fee.feeCents },
  ] };
};
