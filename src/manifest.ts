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
  settings: Type.Object({}),
  slots: {},
  tools: {},
  wiring: [],
});
