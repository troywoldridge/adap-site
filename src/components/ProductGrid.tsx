import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product"; // Update if needed

interface Props {
  products: Product[];
}

export default function ProductGrid({ products }: Props) {
  return (
    <ul className="product-grid">
      {products.map(prod => (
        <ProductCard key={prod.id} product={prod} />
      ))}
    </ul>
  );
}
