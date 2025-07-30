'use client';

import { useEffect, useState } from 'react';
import ProductImageGallery from '@/components/ProductImageGallery';
import ProductOptionSelector from '@/components/ProductOptionSelector';
import ProductPriceDisplay from '@/components/ProductPriceDisplay';
import { toProductImages } from '@/lib/image';
import { groupProductOptions } from "@/lib/option-utils";
import type { ProductOptionGroup } from "@/types/db";

import type { Product, Image, Option } from '@/types/db';
import type { ProductImage, ProductOption  } from '@/types/db';

export default function ProductPage({ params }: { params: { productId: string } }) {
  const { productId } = params;

  const [product, setProduct] = useState<Product | null>(null);
  const [rawImages, setRawImages] = useState<Image[]>([]);
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  
setOptionGroups(optionGroups);

useEffect(() => {
  async function fetchData() {
    try {
      const productRes = await fetch(`/api/product/${productId}`);
      const productData: Product = await productRes.json();

      const imageRes = await fetch(`/api/images/${productId}`);
      const imageData: Image[] = await imageRes.json();

      const optionsRes = await fetch(`/api/options/${productId}`);
      const rawOptions: Option[] = await optionsRes.json();

      const groupedOptions = groupProductOptions(rawOptions); // ← FIXED: renamed from optionData

      setProduct(productData);
      setRawImages(imageData);
      setOptionGroups(groupedOptions); // ← FIXED: use correct setter
    } catch (err) {
      console.error("Failed to load product page data:", err);
    }
  }

  fetchData();
}, [productId]);


  useEffect(() => {
    if (selectedOptions.length === 6) {
      fetch(`/api/pricing/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOptions }),
      })
        .then((res) => res.json())
        .then((data) => setPrice(data.price ?? null))
        .catch((err) => {
          console.error("Pricing fetch failed:", err);
          setPrice(null);
        });
    } else {
      setPrice(null);
    }
  }, [productId, selectedOptions]);

  if (!product) return <div>Loading...</div>;

  const productImages: ProductImage[] = toProductImages(rawImages);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <ProductImageGallery images={productImages} />

      <h1 className="text-3xl font-bold my-4">{product.name}</h1>
      <p className="mb-4 text-gray-600">{product.description}</p>

     <ProductOptionSelector
  optionGroups={optionGroups} // ✅ new correct prop name
  selectedOptions={selectedOptions}
  setSelectedOptions={setSelectedOptions}
/>


      <ProductPriceDisplay price={price} />

      <button
        className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        disabled={price === null}
        onClick={() => alert('Add to cart coming soon!')}
      >
        Add to Cart
      </button>
    </div>
  );
}
