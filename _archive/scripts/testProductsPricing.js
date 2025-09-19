import fetch from "node-fetch";

async function testPricing() {
  const productId = 123;
  const hash = "051203070109"; // example hash from 6 option IDs padded (6x2=12 chars)
  const url = `http://localhost:3000/api/products/${productId}/pricing?hash=${hash}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    console.log(`Status: ${res.status}`);
    console.log("Pricing:", data);
  } catch (err) {
    console.error("Error during pricing test:", err);
  }
}

testPricing();
