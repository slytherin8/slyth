// Simple test to check if server is accessible
const fetch = require('node-fetch');

async function testConnections() {
  const urls = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://10.212.38.219:5000'
  ];

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url, { timeout: 5000 });
      const text = await response.text();
      console.log(`✅ SUCCESS: ${url} - ${text}`);
    } catch (error) {
      console.log(`❌ FAILED: ${url} - ${error.message}`);
    }
  }
}

testConnections();