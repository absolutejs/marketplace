# @absolutejs/marketplace

Headless marketplace policy and settlement primitives for AbsoluteJS applications.

It models fixed-price listings, criteria-based buy orders, auctions, direct trades,
opaque pagination cursors, asset matching, seller-paid fees, anti-sniping, idempotency,
and explicit state transitions without choosing a database or web framework.

```ts
import { criteriaFromAsset, matchesAssetCriteria, planSaleSettlement } from "@absolutejs/marketplace";

const wanted = criteriaFromAsset(copy, "exact", 100);
if (matchesAssetCriteria(candidate, wanted)) {
  const plan = planSaleSettlement({
    idempotencyKey: "sale:42",
    assetId: candidate.id,
    buyerAccountId: "wallet:buyer",
    sellerAccountId: "wallet:seller",
    platformAccountId: "wallet:platform",
    grossCents: 2500,
  });
  // Apply `plan.entries` and the ownership transfer in one storage transaction.
}
```

The package deliberately emits a settlement plan instead of pretending independent
wallet and ownership calls are atomic. Adapters must commit the wallet entries, asset
transfer, entity status, and idempotency record in one database transaction.
