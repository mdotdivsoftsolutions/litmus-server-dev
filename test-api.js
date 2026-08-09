const axios = require('axios');

async function run() {
  try {
    const res = await axios.get('http://localhost:5000/api/v1/packages?limit=12&page=1');
    console.log("Count:", res.data.count);
    console.log("Total:", res.data.total);
    console.log("Pages:", res.data.pages);
  } catch (err) {
    console.error(err.message);
  }
}

run();
