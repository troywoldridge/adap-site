// src/lib/sinalite.client.ts
export interface RawProduct {
  id: number;
  sku: string;
  name: string;
  category: string;
  enabled: number;
  imageUrl: string;
}

export const SinaliteClient = {
  async listProducts(): Promise<RawProduct[]> {
    const token = process.env.SINALITE_TOKEN;
    if (!token) {
      throw new Error("Missing SINALITE_TOKEN");
    }
    const res = await fetch("https://api.sinaliteuppy.com/product", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Sinalite API error: ${res.status}`);
    }
    return res.json() as Promise<RawProduct[]>;
  },
};
