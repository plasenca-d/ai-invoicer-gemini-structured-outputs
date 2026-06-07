import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class LineItem {
  @Prop({
    required: true,
    trim: true,
  })
  description: string;

  @Prop({
    required: true,
    min: 1,
  })
  quantity: number;

  @Prop({
    required: true,
    min: 0,
  })
  unitPrice: number;

  @Prop({
    required: true,
    min: 0,
  })
  total: number;

  @Prop({
    trim: true,
  })
  sku?: string;
}

export const LineItemSchema = SchemaFactory.createForClass(LineItem);

// Without own _id. _id will be managed by parent array
LineItemSchema.set('_id', false);
