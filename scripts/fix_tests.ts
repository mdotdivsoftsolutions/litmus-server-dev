import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Test from '../src/models/Test';

async function fixTests() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // Update all tests that don't have applicableCategories and are not isApplicableToAll
    const result = await Test.updateMany(
      { 
        $or: [
          { applicableCategories: { $exists: false } },
          { applicableCategories: { $size: 0 } }
        ],
        isApplicableToAll: { $ne: true }
      },
      { 
        $set: { isApplicableToAll: true } 
      }
    );

    console.log(`Updated ${result.modifiedCount} tests to be applicable to all categories.`);
    process.exit(0);
  } catch (error) {
    console.error("Error fixing tests:", error);
    process.exit(1);
  }
}

fixTests();
