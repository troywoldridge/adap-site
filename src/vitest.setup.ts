import { vi } from "vitest";

vi.mock("server-only", () => ({} as any));

// Make markup deterministic for tests
process.env.MARKUP_APPLY_LEVEL = "line";
