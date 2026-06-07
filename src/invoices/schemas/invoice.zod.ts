import { z } from 'zod';

// Sub-schemas
export const LineItemZodSchema = z.object({
  description: z.string().min(1).trim(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  sku: z.string().trim().optional(),
});

export const TaxZodSchema = z.object({
  rate: z.number().min(0).max(1),
  amount: z.number().nonnegative(),
});

export const SourceMetaZodSchema = z.object({
  provider: z.enum(['gemini', 'vercel-ai']),
  modality: z.enum(['text', 'image', 'ocr_text']),
  extractedAt: z
    .string()
    .pipe(z.iso.datetime())
    .default(() => new Date().toISOString()),
});

export const InvoiceZodSchema = z.object({
  _id: z.string().optional(),

  vendorId: z.string().default('UNKNOWN').optional(),
  invoiceNumber: z.string().default('UNKNOWN').optional(),
  issueDate: z
    .string()
    .pipe(z.iso.datetime())
    .default(() => new Date().toISOString())
    .optional(),
  dueDate: z.string().pipe(z.iso.datetime()).optional(),

  lineItems: z
    .array(LineItemZodSchema)
    .default([
      {
        description: 'unknown',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ])
    .optional(),

  subtotal: z.number().default(0).optional(),
  tax: TaxZodSchema.default({ rate: 0, amount: 0 }).optional(),
  total: z.number().default(0).optional(),

  currency: z.enum(['USD', 'EUR', 'ARS', 'BRL']).default('USD').optional(),

  source: SourceMetaZodSchema,
});

export type InvoiceZod = z.infer<typeof InvoiceZodSchema>;
export type LineItemZod = z.infer<typeof LineItemZodSchema>;
export type TaxZod = z.infer<typeof TaxZodSchema>;
export type SourceMetaZod = z.infer<typeof SourceMetaZodSchema>;
