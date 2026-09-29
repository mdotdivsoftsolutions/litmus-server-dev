import mongoose, { Schema } from 'mongoose';

/**
 * Counter model — atomic sequence generator using MongoDB findOneAndUpdate + $inc.
 * Guarantees race-safe, monotonically increasing sequences per named counter.
 */

const CounterSchema: Schema = new Schema({
  _id: { type: String, required: true }, // e.g. "booking_order_code"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model<{ _id: string; seq: number }>('Counter', CounterSchema);

/**
 * Atomically increment and return the next sequence value for a named counter.
 * Thread-safe via MongoDB's findOneAndUpdate + upsert.
 */
export async function getNextSequence(name: string): Promise<number> {
  const result = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result!.seq;
}

export default Counter;
