import { getSubcategories } from "@/lib/sinalite.client";
import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import images from "@/data/images.json";
import SubcategoryCard from "@/components/SubcategoryCard";

export default async function CategoryPage({ params }) {
  const { categoryId } = params;
  const asset = categoryAssets.find(c => c.id === categoryId);
  const subcategories = await getSubcategories(categoryId, process.env.NEXT_PUBLIC_STORE_CODE!);

  // Merge subcategories with your assets
  const merged = subcategories.map(sub => {
    const assetSub = subcategoryAssets.find(s => s.id === sub.id);
    return { ...sub, ...assetSub, image: images[sub.id] };
  });

  return (
    <section>
      <header>
        <h1>{asset?.name || categoryId}</h1>
        <img src={asset?.image || ""} alt={asset?.name} />
      </header>
      <div className="grid">
        {merged.map(sub => (
          <SubcategoryCard key={sub.id} subcategory={sub} />
        ))}
      </div>
    </section>
  );
}
