import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  timestamps: true,
})
export class Vendor {
  @Prop({
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  taxId: string;

  @Prop({
    required: true,
    trim: true,
  })
  address: string;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

VendorSchema.index({ name: 'text' });

export type VendorDocument = HydratedDocument<Vendor>;
