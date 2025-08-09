// src/lib/sinalite.client.ts
export async function getCategories(storeCode: string) {
  const res = await fetch(`https://api.sinalite.com/storefront/${storeCode}/categories`);
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  return res.json();
}
export async function getSubcategories(categoryId: string, storeCode: string) {
  const res = await fetch(`https://api.sinalite.com/storefront/${storeCode}/categories/${categoryId}/subcategories`);
  if (!res.ok) {
    throw new Error("Failed to fetch subcategories");
  }
  return res.json();
}
export async function getProductsBySubcategory(subcategoryId: string, storeCode: string) {
  const res = await fetch(`https://api.sinalite.com/storefront/${storeCode}/subcategories/${subcategoryId}/products`);
  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }
  return res.json();
}
export async function getProductDetails(productId: string, storeCode: string) {
  const res = await fetch(`https://api.sinalite.com/storefront/${storeCode}/products/${productId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch product details");
  }
  return res.json();
}
