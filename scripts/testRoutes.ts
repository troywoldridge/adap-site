// scripts/testRoutes.ts

import axios from "axios";

const BASE_URL = "http://localhost:3000/api";

// Replace these with actual test IDs from your DB
const testProductId = 123;
const testSubcategoryId = 12;
const testCategoryId = 4;

const testEndpoints = async () => {
  try {
    console.log("\n🔎 Testing /products/[productId]");
    const productRes = await axios.get(`${BASE_URL}/products/${testProductId}`);
    console.log("✅ Product:", productRes.data);

    console.log("\n🔎 Testing /products/[productId]/options");
    const optionsRes = await axios.get(`${BASE_URL}/products/${testProductId}/options`);
    console.log("✅ Options:", optionsRes.data);

    console.log("\n🔎 Testing /products/[productId]/pricing");
    const pricingRes = await axios.get(`${BASE_URL}/products/${testProductId}/pricing`);
    console.log("✅ Pricing:", pricingRes.data);

    console.log("\n🔎 Testing /products/[productId]/images");
    const imagesRes = await axios.get(`${BASE_URL}/products/${testProductId}/images`);
    console.log("✅ Images:", imagesRes.data);

    console.log("\n🔎 Testing /products/subcategory/[subcategoryId]");
    const subcatRes = await axios.get(`${BASE_URL}/products/subcategory/${testSubcategoryId}`);
    console.log("✅ Products by Subcategory:", subcatRes.data);

    console.log("\n🔎 Testing /subcategories/[categoryId]");
    const subcategoriesRes = await axios.get(`${BASE_URL}/subcategories/${testCategoryId}`);
    console.log("✅ Subcategories by Category:", subcategoriesRes.data);

    console.log("\n🎉 All endpoints tested successfully!");
  } catch (error: unknown) {
    console.error("❌ Error testing endpoint:", error?.response?.data || error.message);
  }
};

testEndpoints();
