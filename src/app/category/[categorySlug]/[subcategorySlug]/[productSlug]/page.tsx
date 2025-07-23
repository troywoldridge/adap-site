// app/category/[category]/[subcategory]/[product]/page.tsx
import { notFound } from 'next/navigation';
import { listProducts, getProductDetails } from '@/lib/sinalite/products';

export async function generateStaticParams() {
  const all = await listProducts();
  return all
    .filter(p=>p.enabled)
    .map(p=>({
      category: p.category.toLowerCase().replace(/\s+/g,'-'),
      subcategory: p.category.toLowerCase().replace(/\s+/g,'-'),
      product: p.sku,
    }));
}

export default async function ProductPage({ params }:{
  params:{ category:string, subcategory:string, product:string }
}) {
  const all = await listProducts();
  const prod = all.find(p=>p.sku===params.product && p.enabled);
  if (!prod) {
    return notFound();
  }

  const { options, pricingData, metadata } = await getProductDetails(prod.id,'en_us');

  return (
    <main style={{padding:'2rem',maxWidth:800,margin:'auto'}}>
      <h1>{prod.name}</h1>
      <p><strong>SKU:</strong> {prod.sku}</p>
      <h2>Options</h2>
      <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(options,null,2)}</pre>
      <h2>Pricing Data</h2>
      <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(pricingData,null,2)}</pre>
      {/* … add “Add to Cart” button, selection UI, etc. … */}
    </main>
  );
}
