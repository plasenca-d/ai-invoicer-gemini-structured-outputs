import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LineItem, LineItemSchema } from './line-item.entity';
import { Tax, TaxSchema } from './tax.entity';
import { SourceMeta, SourceMetaSchema } from './source-meta.entity';

@Schema({
  timestamps: true,
})
export class Invoice {
  @Prop({
    type: Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true,
  })
  vendorId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  invoiceNumber: string;

  @Prop({
    required: true,
    index: true,
  })
  issueDate: Date;

  @Prop()
  dueDate?: Date;

  @Prop({
    type: [LineItemSchema],
    default: [],
  })
  lineItems: LineItem[]; // embed, no separate collection

  @Prop({
    required: true,
    min: 0,
  })
  subTotal: number;

  @Prop({
    type: TaxSchema,
    default: () => ({}),
  })
  tax: Tax;

  @Prop({
    required: true,
    min: 0,
    index: true,
  })
  total: number;

  @Prop({
    default: 'USD',
    enum: ['USD', 'EUR', 'ARS', 'BRL', 'PEN'],
  })
  currency: string;

  @Prop({
    type: SourceMetaSchema,
  })
  source: SourceMeta;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Compound index: vendor + invoiceNumber unique together
InvoiceSchema.index(
  {
    vendorId: 1,
    invoiceNumber: 1,
  },
  {
    unique: true,
  },
);

// Compound index for filters by date + vendor
InvoiceSchema.index({
  vendorId: 1,
  issueDate: -1,
});

// Multikey index for looking for SKU inside lineItems
InvoiceSchema.index({ 'lineItems.sku': 1 });

export type InvoiceDocument = HydratedDocument<Invoice>;
