import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Tax {
  @Prop({
    required: true,
    min: 0,
    max: 1,
  })
  rate: number; // 0.21 = 21%

  @Prop({
    required: true,
    min: 0,
  })
  amount: number;
}

export const TaxSchema = SchemaFactory.createForClass(Tax);

// Without own _id. _id will be managed by parent array
TaxSchema.set('_id', false);
