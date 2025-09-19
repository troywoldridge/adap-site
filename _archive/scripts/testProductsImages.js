import fetch from "node-fetch";

async function testImages() {
  const productId = 123; // replace with valid productId
  const url = `http://localhost:3000/api/products/${productId}/images`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    console.log(`Status: ${res.status}`);
    console.log("Images:", data);
  } catch (err) {
    console.error("Error during images test:", err);
  }
}

testImages();
