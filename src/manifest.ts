import { defineManifest } from "@absolutejs/manifest";
import { Type } from "@sinclair/typebox";

export const manifest = defineManifest<
  Record<never, never>,
  Record<never, never>
>()({
  contract: 2,
  identity: {
    accent: "#6366f1",
    category: "commerce",
    description:
      "Headless listings, criteria orders, auctions, trades, anti-sniping, state transitions, and atomic collectible settlement plans.",
    docsUrl: "https://github.com/absolutejs/marketplace",
    name: "@absolutejs/marketplace",
    tagline: "One asset, one owner, one settlement.",
  },
  product: {
    blocks: [
      {
        category: "commerce",
        componentExport: "MarketplaceListings",
        description:
          "Render typed listings with auction, criteria-order, and settlement posture.",
        frameworks: ["react", "client"],
        id: "marketplace_listings",
        props: Type.Object({
          mode: Type.Optional(
            Type.Union([
              Type.Literal("fixed"),
              Type.Literal("auction"),
              Type.Literal("criteria"),
            ]),
          ),
        }),
        title: "Marketplace listings",
      },
    ],
    dataSources: [
      {
        description:
          "Listings, offers, auctions, and trades with atomic settlement plans.",
        id: "marketplace_listings",
        operations: ["list", "detail"],
        schema: Type.Object({
          assetId: Type.String(),
          listingId: Type.String(),
          ownerId: Type.String(),
          status: Type.String(),
        }),
        title: "Marketplace listings",
      },
    ],
    events: [
      {
        description:
          "Emitted when a listing, bid, trade, or settlement changes state.",
        id: "marketplace_state_changed",
        schema: Type.Object({
          id: Type.String(),
          kind: Type.String(),
          status: Type.String(),
        }),
        source: "package",
        title: "Marketplace state changed",
      },
    ],
  },
  settings: Type.Object({}),
  slots: {},
  tools: {},
  wiring: [],
});
