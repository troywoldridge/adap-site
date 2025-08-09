import CategoryCard from "@/components/CategoryCard";
import type { Category } from "@/types/category";

interface Props {
  categories: Category[];
}

export default function CategoryGrid({ categories }: Props) {
  return (
    <ul className="category-grid">
      {categories.map(cat => (
        <CategoryCard key={cat.id} category={cat} />
      ))}
    </ul>
  );
}
