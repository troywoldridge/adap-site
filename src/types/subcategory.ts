export interface Subcategory {
  id: string | number;
  slug: string;
  name: string;
  categoryId: string | number;
  description?: string;
  image?: string;
}
