import fetch from "node-fetch";

async function testOptions() {
  const productId = 123;
  const url = `http://localhost:3000/api/products/${productId}/options`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    console.log(`Status: ${res.status}`);
    console.log("Options:", data);
  } catch (err) {
    console.error("Error during options test:", err);
  }
}

testOptions();
