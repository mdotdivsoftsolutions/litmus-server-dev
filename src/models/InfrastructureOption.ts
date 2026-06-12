import mongoose, { Schema, Document } from 'mongoose';

export interface IInfrastructureOption extends Document {
  title: string;
  description: string;
  icon: string;
}

const InfrastructureOptionSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
    default: 'microscope',
  },
}, { timestamps: true });

export default mongoose.model<IInfrastructureOption>('InfrastructureOption', InfrastructureOptionSchema);
