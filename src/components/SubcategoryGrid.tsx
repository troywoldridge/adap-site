import SubcategoryCard from "@/components/SubcategoryCard";
import type { SubcategoryAsset } from "@/lib/mergeUtils"; // or "@/types/subcategory"

interface Props {
  subcategories: SubcategoryAsset[];
}

export default function SubcategoryGrid({ subcategories }: Props) {
  return (
    <ul className="subcategory-grid">
      {subcategories.map(subcat => (
        <SubcategoryCard key={subcat.id} subcategory={subcat} />
      ))}
    </ul>
  );
}
