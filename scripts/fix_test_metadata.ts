import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Test from '../src/models/Test';

async function fixTestMetadata() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // Find tests where metadata.parameters is missing or empty
    const tests = await Test.find({
      $or: [
        { 'metadata.parameters': { $exists: false } },
        { 'metadata.parameters': { $size: 0 } }
      ]
    });

    console.log(`Found ${tests.length} tests to fix.`);

    for (const test of tests) {
      // Set metadata parameters with the single test as a parameter
      test.metadata = {
        ...(test.metadata || {}),
        parameters: [
          {
            name: test.testName,
            unit: '',
            minLimit: '',
            maxLimit: '',
            price: test.price || 0
          }
        ]
      };
      
      // Save without validation to avoid any strict schema issues on metadata, though it's Mixed
      await Test.updateOne({ _id: test._id }, { $set: { metadata: test.metadata } });
    }

    console.log(`Successfully updated ${tests.length} tests with metadata parameters.`);
    process.exit(0);
  } catch (error) {
    console.error("Error fixing tests:", error);
    process.exit(1);
  }
}

fixTestMetadata();
