// src/lib/option-utils.ts

import type { Option, ProductOptionGroup } from "@/types/db";

export function groupProductOptions(options: Option[]): ProductOptionGroup[] {
  const grouped: Record<number, ProductOptionGroup> = {};

  for (const opt of options) {
    if (!grouped[opt.groupId]) {
      grouped[opt.groupId] = {
        groupId: opt.groupId,
        groupName: opt.name, // You may want to fix this if you have group names separately
        options: [],
      };
    }

    grouped[opt.groupId].options.push({
      id: opt.id,
      name: opt.name,
      group: opt.name, // or real group name if available
      groupId: opt.groupId,
    });
  }

  return Object.values(grouped);
}
