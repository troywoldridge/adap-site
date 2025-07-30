import { db } from "@/lib/db";
import { options } from "@/drizzle/migrations/schema";
import { eq } from "drizzle-orm";
import type { Option } from "@/types";

export const getProductOptions = async (productId: string): Promise<Option[]> => {
  const id = parseInt(productId, 10);
  if (isNaN(id)) {
    throw new Error("Invalid productId");
  }

  return await db
      .select({
        id: options.id,
        productId: options.productId,
        sku: options.sku,
        optionId: options.optionId,
        group: options.group,
        name: options.name,
        hidden: options.hidden,
        createdAt: options.createdAt,
        updatedAt: options.updatedAt,
      })
      .from(options)
      .where(eq(options.productId, id));
};
