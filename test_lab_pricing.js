const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/litmus');
  const db = mongoose.connection.useDb('litmus');
  const lab = await db.collection('laboratories').findOne({ labName: /Mumbai Analytical/i });
  console.dir(lab.pricing, { depth: null });
  process.exit(0);
}
check();
