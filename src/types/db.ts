// src/types/db.ts
import type { ReactNode } from "react";


// ---------- CATEGORIES ----------
export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  hidden: boolean;
  sortOrder: number | null;
  createdAt: Date;
}





export interface Subcategory {
  id: number;
  name: string;
  categoryId: string;
  hidden: boolean;
  sortOrder: number | null;
  createdAt: Date;
}

// ---------- PRODUCTS ----------
export interface Product {
  images(images: unknown): Image[];
  description: ReactNode;
  id: string;
  name: string;
  subcategoryId: number;
  sku: string;
  hidden: boolean;
  createdAt: Date;
}

// ---------- OPTIONS & GROUPS ----------
export interface OptionGroup {
  id: number;
  groupId: number;
  name: string;
  hidden: boolean;
  productId: string;
}

export interface Option {
  id: number;
  productId: number;
  sku: string | null;
  optionId: string | null;
  group: string; // ✅ use this, not groupId
  name: string;
  hidden: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}


export interface ProductOption {
  id: number;
  name: string;
  groupId: number;
  group: string;
}

export interface ProductOptionGroup {
  groupId: number;
  group: string;
  options: ProductOption[];
}

// ---------- VARIANTS ----------
export interface ProductVariant {
  id: string;
  productId: string;
  option1Id: number | null;
  option2Id: number | null;
  option3Id: number | null;
  sku: string;
  hidden: boolean;
  createdAt: Date;
}

// ---------- PRICING ----------
export interface Pricing {
  id: string;
  variantId: string;
  price: number;
  quantity: number;
  turnaround: string;
}

export interface PricingRow {
  id: number;
  category: string;
  product: string | number;
  rowNumber: number;
  hash: string;
  value: string;
  type: string;
  markup: number | null;
  numericValue: number | null;
  width?: number;
  height?: number;
  depth?: number;
  rawDimensions?: string;
}

// ---------- IMAGES ----------

/**
 * Raw image entry from DB, used for storage, linking, admin UI
 */
export interface Image {
  id: number;  // Comes from database as number
  productId: string | null;
  categoryId: string | null;
  subcategoryId: number | null;
  type: 'product' | 'category' | 'subcategory' | 'other';
  url: string;
  alt: string | null;
}

/**
 * Lightweight version for client display.
 * Use this in frontend components where image `id` must be a string (e.g. React key).
 */
export type ProductImage = {
  id: string;       // `String(image.id)` when transforming raw Image to this
  url: string;
  alt?: string | null;
};



