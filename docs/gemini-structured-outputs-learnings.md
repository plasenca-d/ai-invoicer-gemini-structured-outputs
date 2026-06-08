# Gemini Structured Outputs: Error Fixes and Learnings

Document capturing the key problems encountered while implementing Gemini structured outputs with Zod v4.

**Date**: 2026-06-07  
**Stack**: NestJS 11, TypeScript 5.7, Zod v4, `@google/genai` SDK

---

## Problem 1: `exclusiveMinimum: true` (boolean, not number)

**Symptom**:
```
"error": {"code": 400, "message": "value at properties.lineItems.items.properties.quantity.exclusiveMinimum must be a number"}
```

**Root Cause**: Zod v4 converts `z.number().positive()` to JSON Schema with `"exclusiveMinimum": true` (boolean). JSON Schema requires a number, not a boolean.

**Fix**: Use `z.number().int().min(1)` instead of `.positive()`.

```typescript
// Before (❌)
quantity: z.number().int().positive()

// After (✅)
quantity: z.number().int().min(1)  // generates "minimum": 1
```

---

## Problem 2: Wrong SDK parameter name

**Symptom**: Error "No schema provided" or model ignoring schema.

**Root Cause**: The SDK uses `responseSchema` (not `responseJsonSchema`).

```typescript
// Before (❌)
config: {
  responseJsonSchema: schema,  // wrong name
}

// After (✅)
config: {
  responseSchema: schema,
  responseMimeType: 'application/json',
}
```

---

## Problem 3: `z.date()` vs string from model

**Symptom**:
```
ZodError: [{"expected":"date","code":"invalid_type","path":["issueDate"]}]
```

**Root Cause**: Gemini returns ISO strings (`"2024-07-30T12:00:00Z"`), but `z.date()` expects JavaScript Date objects.

**Fix**: Use `z.string().pipe(z.iso.datetime())` in Zod v4.

```typescript
// Before (❌)
issueDate: z.date()

// After (✅)
issueDate: z.string().pipe(z.iso.datetime()).default(() => new Date().toISOString())
```

---

## Problem 4: Model ignoring the schema

**Symptom**: Model returns `{"status": "ok"}` or Python code instead of JSON.

**Root Cause**: Without explicit instruction, Gemini returns text in its preferred format.

**Fix**: Three-layer defense:

1. **System instruction**:
```typescript
const SYSTEM_INSTRUCTION = 
  'You are a JSON generator. You MUST respond ONLY with valid JSON that matches ' +
  'the provided schema. Do NOT return empty objects. Do NOT return null values. ' +
  'Every required field must be populated. Use reasonable default values if uncertain. ' +
  'Do NOT include any text before or after the JSON.';
```

2. **Example in JSON Schema**:
```typescript
const schema = toJsonSchema(InvoiceZodSchema, {
  example: {
    vendorId: 'UNKNOWN',
    invoiceNumber: 'INV-001',
    issueDate: new Date().toISOString(),
    lineItems: [{ description: 'unknown', quantity: 1, unitPrice: 0, total: 0 }],
    subtotal: 0,
    tax: { rate: 0, amount: 0 },
    total: 0,
    currency: 'USD',
    source: { provider: 'gemini', modality: 'text', extractedAt: new Date().toISOString() },
  },
});
```

3. **Zod defaults for resilience**:
```typescript
vendorId: z.string().default('UNKNOWN').optional()
```

---

## Working Configuration

### Zod Schema

```typescript
import { z } from 'zod';

export const LineItemZodSchema = z.object({
  description: z.string().min(1).trim(),
  quantity: z.number().int().min(1),  // min(1), NOT positive()
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  sku: z.string().trim().optional(),
});

export const SourceMetaZodSchema = z.object({
  provider: z.enum(['gemini', 'vercel-ai']),
  modality: z.enum(['text', 'image', 'ocr_text']),
  extractedAt: z.string().pipe(z.iso.datetime()).default(() => new Date().toISOString()),
});

export const InvoiceZodSchema = z.object({
  _id: z.string().optional(),
  vendorId: z.string().default('UNKNOWN').optional(),
  invoiceNumber: z.string().default('UNKNOWN').optional(),
  issueDate: z.string().pipe(z.iso.datetime()).default(() => new Date().toISOString()).optional(),
  dueDate: z.string().pipe(z.iso.datetime()).optional(),
  lineItems: z.array(LineItemZodSchema).default([{
    description: 'unknown',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  }]).optional(),
  subtotal: z.number().default(0).optional(),
  tax: z.object({
    rate: z.number().min(0).max(1),
    amount: z.number().nonnegative(),
  }).default({ rate: 0, amount: 0 }).optional(),
  total: z.number().default(0).optional(),
  currency: z.enum(['USD', 'EUR', 'ARS', 'BRL']).default('USD').optional(),
  source: SourceMetaZodSchema,
});
```

### JSON Schema Converter

```typescript
import * as z from 'zod';

export function toJsonSchema<T>(zodSchema: z.ZodType<T>, options?: { example?: object }): object {
  const schema = z.toJSONSchema(zodSchema, {
    target: 'openapi-3.0',
    unrepresentable: 'any',
    override: (ctx) => {
      const def = (ctx.zodSchema as unknown as { _def?: { type?: string } })._def;
      if (def?.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
      if (ctx.jsonSchema.exclusiveMinimum === true) {
        ctx.jsonSchema.exclusiveMinimum = 0;
      }
      if (ctx.jsonSchema.exclusiveMaximum === true) {
        ctx.jsonSchema.exclusiveMaximum = 999999999;
      }
    },
  });

  if (options?.example) {
    (schema as any).example = options.example;
  }

  return schema;
}
```

### ExtractService Call

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents,
  config: {
    responseSchema: schema,         // NOT responseJsonSchema
    responseMimeType: 'application/json',
    systemInstruction: SYSTEM_INSTRUCTION,
  },
});

const result = InvoiceZodSchema.safeParse(parsed);  // safeParse, not parse
```

---

## Key Lessons

| Lesson | Detail |
|--------|--------|
| `responseSchema` not `responseJsonSchema` | SDK uses different parameter names — verify with your SDK version |
| `z.string().pipe(z.iso.datetime())` | Zod v4 for string-to-date transformations |
| `min(1)` not `positive()` | `positive()` generates invalid JSON Schema boolean |
| System instruction is mandatory | Without it, model returns text/code instead of JSON |
| Example in schema guides model | Helps model understand expected structure |
| Always `safeParse()` + logging | Defense in depth — model can ignore schema |