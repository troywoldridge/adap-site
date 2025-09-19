import fetch from "node-fetch";

async function testProductsBySubcategory() {
  const subcategoryId = 5; // replace with valid subcategoryId
  const url = `http://localhost:3000/api/products/subcategory/${subcategoryId}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    console.log(`Status: ${res.status}`);
    console.log("Products by Subcategory:", data);
  } catch (err) {
    console.error("Error during subcategory test:", err);
  }
}

testProductsBySubcategory();
