export interface Product {
  id: string | number;
  sku?: string;
  slug?: string;
  name: string;
  description?: string;
  subcategoryId?: string | number;
  categoryId?: string | number;
  image?: string;
  // Add other fields as needed (price, options, etc.)
}
