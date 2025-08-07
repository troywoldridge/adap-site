// src/app/products/[id]/page.tsx
import { Metadata } from "next";
import ProductConfigurator from "@/lib/ProductConfigurator"; // Use alias for cleaner import
import { getProductDetails } from "@/lib/sinalite.client";

interface Props { params: { id: string } }

export async function generateStaticParams(): Promise<Props["params"][]> {
  // Static site generation: Return [] to generate nothing at build (you can fill if you wish)
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const productId = Number(params.id);
  const [options] = await getProductDetails(productId, process.env.NEXT_PUBLIC_STORE_CODE!);
  return { title: options[0]?.name ?? "Product" };
}

export default async function ProductPage({ params }: Props) {
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE;
  const productId = Number(params.id);

  if (!storeCode) {
    return <main className="container py-8"><h1>Missing Store Code!</h1></main>;
  }
  if (isNaN(productId) || !params.id) {
    return <main className="container py-8"><h1>Invalid product ID.</h1></main>;
  }

  let optionList, pricingTable, metaFlags;
  try {
    [optionList, pricingTable, metaFlags] = await getProductDetails(productId, storeCode);
  } catch (err) {
    return (
      <main className="container py-8">
        <h1>Product Not Found</h1>
        <p className="text-red-600">{(err as Error).message}</p>
      </main>
    );
  }

  // Option type
  type Option = { id: number; name: string };

  // Group options by "group"
  const groups: Record<string, Option[]> = {};
  for (const opt of optionList) {
    if (!groups[opt.group]) {
      groups[opt.group] = [];
    }
    groups[opt.group].push({ id: opt.id, name: opt.name });
  }

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Configure Your Product</h1>
      <ProductConfigurator
        productId={productId}
        storeCode={storeCode}
        groups={groups}
        metaFlags={metaFlags}
      />
    </main>
  );
}
