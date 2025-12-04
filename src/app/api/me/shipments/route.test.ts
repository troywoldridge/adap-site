import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));

const mockCookies = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies: mockCookies }));

const dbState = vi.hoisted(() => ({
  selectResultRef: { current: [] as any[] },
  updateCalls: [] as any[],
  updateWhere: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => dbState.selectResultRef.current),
      })),
    })),
  }));

  const update = vi.fn(() => ({
    set: vi.fn((values) => {
      dbState.updateCalls.push(values);
      return { where: dbState.updateWhere };
    }),
  }));

  const db = Object.assign({ select, update }, dbState);
  return { db };
});

import { db } from "@/lib/db";
import { GET } from "./route";

describe("/api/me/shipments", () => {
  beforeEach(() => {
    (db as any).selectResultRef.current = [];
    (db as any).updateCalls.length = 0;
    (db as any).updateWhere.mockReset();
    mockAuth.mockReset();
    mockCookies.mockReset();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.INTERNAL_API_BASE = "https://internal.example.com";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("denies access when the requester does not own the order", async () => {
    (db as any).selectResultRef.current = [
      {
        id: "order-1",
        userId: "someone-else",
        provider: "sinalite",
        providerId: "provider-1",
      },
    ];

    mockAuth.mockResolvedValue({ userId: "user-123" });
    mockCookies.mockResolvedValue({ get: () => undefined });

    const req = new Request("http://localhost/api/me/shipments?orderId=order-1");
    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload.error).toBe("forbidden");
  });

  it("claims guest orders, forwards auth headers, and maps proxy shipments", async () => {
    (db as any).selectResultRef.current = [
      {
        id: "order-2",
        userId: "guest-sid-1",
        provider: "sinalite",
        providerId: "provider-2",
      },
    ];

    mockAuth.mockResolvedValue({ userId: "user-456" });
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "adap_sid" ? { value: "guest-sid-1" } : name === "sid" ? { value: "guest-sid-1" } : undefined,
    });

    const upstreamShipments = {
      shipments: [
        {
          carrier: "UPS",
          tracking_number: "1Z999AA10123456784",
          status: "In transit",
          eta: "2024-01-01",
          events: [
            { timestamp: "2023-12-30T12:00:00Z", description: "Departed", location: "Toronto" },
          ],
        },
      ],
    };

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(upstreamShipments), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as any);

    const req = new Request("http://localhost/api/me/shipments?orderId=order-2", {
      headers: {
        authorization: "Bearer test-token",
        cookie: "adap_sid=guest-sid-1; other=1",
      },
    });

    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.shipments).toEqual([
      {
        carrier: "UPS",
        trackingNumber: "1Z999AA10123456784",
        status: "In transit",
        eta: "2024-01-01",
        events: [
          { time: "2023-12-30T12:00:00Z", description: "Departed", location: "Toronto" },
        ],
      },
    ]);

    expect((db as any).updateCalls).toContainEqual({ userId: "user-456" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://internal.example.com/sinalite/orders/provider-2/shipments",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          Cookie: "adap_sid=guest-sid-1; other=1",
        }),
      }),
    );
  });
});
