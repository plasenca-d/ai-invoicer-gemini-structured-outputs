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
  extractedAt: z.date(),
});

export const InvoiceZodSchema = z.object({
  _id: z.string().optional(),

  vendorId: z.string(),
  invoiceNumber: z.string().min(1).trim(),
  issueDate: z.date(),
  dueDate: z.date().optional(),

  lineItems: z.array(LineItemZodSchema).min(1),

  subtotal: z.number().nonnegative(),
  tax: TaxZodSchema,
  total: z.number().nonnegative(),

  currency: z.enum(['USD', 'EUR', 'ARS', 'BRL']).default('USD'),

  source: SourceMetaZodSchema,
});

export type InvoiceZod = z.infer<typeof InvoiceZodSchema>;
export type LineItemZod = z.infer<typeof LineItemZodSchema>;
export type TaxZod = z.infer<typeof TaxZodSchema>;
export type SourceMetaZod = z.infer<typeof SourceMetaZodSchema>;
