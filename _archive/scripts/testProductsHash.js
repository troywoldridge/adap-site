// scripts/testProductsHash.js
import fetch from "node-fetch"; // or just native fetch if node 18+

async function testHash() {
  const productId = 123; // replace with a real productId
  const url = `http://localhost:3000/api/products/${productId}/hash`;

  // Example valid optionIds array
  const body = {
    optionIds: [5, 12, 3, 7, 1, 9],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    console.log(`Status: ${res.status}`);
    console.log("Response:", data);
  } catch (err) {
    console.error("Error during hash test:", err);
  }
}

testHash();
