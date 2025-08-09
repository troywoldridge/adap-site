import Link from "next/link";
import type { Category } from "@/types/category";
import type { Subcategory } from "@/types/subcategory";
import type { Product } from "@/types/product";

interface Props {
  category?: Category;
  subcategory?: Subcategory;
  product?: Product;
}

export default function ProductBreadcrumbs({ category, subcategory, product }: Props) {
  return (
    <nav className="breadcrumbs text-xs text-gray-600 mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        <li>
          <Link href="/categories" className="hover:underline text-blue-700">All Products</Link>
          <span>›</span>
        </li>
        {category && (
          <li>
            <Link href={`/categories/${category.id}`} className="hover:underline">{category.name}</Link>
            <span>›</span>
          </li>
        )}
        {subcategory && (
          <li>
            <Link href={`/subcategories/${subcategory.id}`} className="hover:underline">{subcategory.name}</Link>
            <span>›</span>
          </li>
        )}
        {product && (
          <li aria-current="page" className="font-semibold text-black">{product.name}</li>
        )}
      </ol>
    </nav>
  );
}
