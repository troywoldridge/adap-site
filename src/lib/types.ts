// Category
export interface Category {
  id: string;              // text primary key
  slug: string;
  name: string;
  description?: string | null;
  createdAt: string;       // timestamp string
  updatedAt: string;
}

// Subcategory
export interface Subcategory {
  id: number;              // serial primary key
  categoryId: string;      // FK to categories.id
  slug: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Product
export interface Product {
  id: number;
  sku: string;
  name: string;
  categoryLabel: string;
  metadata?: Record<string, unknown> | null;  // JSONB
  subcategoryId?: number | null;
  slug?: string | null;
  categoryId?: string | null;
  sinaliteId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// OptionGroup
export interface OptionsGroup {
  id: number;
  productId: number;
  groupName: string;
}

// Option
export interface Option {
  id: number;
  productId: number;
  sku?: string | null;
  optionId?: string | null;
  group: string;
  name: string;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ProductVariant
export interface ProductVariant {
  id: number;
  productId: number;
  variantSku?: string | null;
  optionCombination?: Record<string, unknown> | null; // JSONB
}

// Pricing
export interface Pricing {
  id: number;
  category: string;
  product: number;
  rowNumber: number;
  hash: string;
  value: number;     // numeric
  type: string;
  markup?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Image
export interface Image {
  id: number;
  filename: string;
  cdnFilename?: string | null;
  cloudflareId: string;
  imageUrl: string;
  isMatched?: boolean;
  productId?: number | null;
  categoryId?: string | null;
  subcategoryId?: number | null;
  variant?: string;
  alt?: string | null;
  createdAt: string;
  updatedAt: string;
}
