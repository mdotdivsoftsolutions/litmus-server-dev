const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Package = require('./src/models/Package').default;
  const User = require('./src/models/User').default;
  
  const adminUsers = await User.find({role: 'ADMIN'});
  const adminUserIds = adminUsers.map(u => u._id);
  
  console.log("Admin IDs:", adminUserIds);
  
  const packages = await Package.find({
    createdBy: { $in: adminUserIds },
    _id: { $nin: [] },
    $or: [
      { approvalStatus: 'APPROVED' },
      { approvalStatus: { $exists: false } }
    ]
  });
  
  console.log("Found packages:", packages);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
