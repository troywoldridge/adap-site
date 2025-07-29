// src/types/db.ts

export interface Category {
  id: string;
  name: string;
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

export interface Product {
  id: string;
  name: string;
  subcategoryId: number;
  sku: string;
  hidden: boolean;
  createdAt: Date;
}

export interface OptionGroup {
  id: number;
  groupId: number;
  name: string;
  hidden: boolean;
  productId: string;
}

export interface Option {
  id: number;
  groupId: number;
  optionId: number;
  name: string;
  hidden: boolean;
  productId: string;
}

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

export interface Pricing {
  id: string;
  variantId: string;
  price: number;
  quantity: number;
  turnaround: string;
}

export interface Image {
  id: number;
  productId: string | null;
  categoryId: string | null;
  subcategoryId: number | null;
  type: 'product' | 'category' | 'subcategory' | 'other';
  url: string;
  alt: string | null;
}
