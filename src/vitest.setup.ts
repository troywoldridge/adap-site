import { vi } from "vitest";

// Next.js provides "server-only". In tests we just no-op it.
vi.mock("server-only", () => ({}));

// Make markup deterministic for tests
process.env.MARKUP_APPLY_LEVEL = "line";
process.env.DEFAULT_MARKUP_MULTIPLIER_US = "1.50";
process.env.DEFAULT_MARKUP_MULTIPLIER_CA = "1.50";
process.env.MIN_MARGIN_PCT = "0"; // no margin floor
process.env.MARKUP_USE_DOT_99 = "false"; // no charm pricing
