import { getProductsBySubcategory } from "@/lib/sinalite.client";
import { mergeProduct } from "@/lib/mergeUtils";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

interface Props {
  currentProductId: string | number;
  subcategoryId: string | number;
}

export default async function RelatedProducts({ currentProductId, subcategoryId }: Props) {
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE!;
  const allProducts = await getProductsBySubcategory(subcategoryId, storeCode);
  const related = allProducts
    .filter((p: any) => p.id !== currentProductId)
    .slice(0, 4)
    .map(mergeProduct) as Product[];

  if (!related.length) return null;

  return (
    <section className="related-products my-14">
      <h3 className="section-title">Related Products</h3>
      <ul className="product-grid">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ul>
    </section>
  );
}
