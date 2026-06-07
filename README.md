# Structured Outputs Mastery

A practical guide to AI structured outputs using **Zod as a single schema source of truth** across two SDKs: Google Gemini and Vercel AI.

> This project is a learning sandbox. The goal: understand structured outputs deeply enough to apply them anywhere.

## What are Structured Outputs?

LLMs are probabilistic — they can return **any** shape. Structured outputs constrain them to return a **specific schema**, every time. Instead of parsing JSON from free-text responses, you get typed, validated data directly.

**Without structured outputs:**
```
Prompt: "Extract invoice data from this text"
Response: "{ "vendor": "Acme Corp", "total": 1500, ... }"  ← need to parse, validate, handle errors
```

**With structured outputs:**
```
Prompt + JSON Schema → Model → Validated JSON matching your schema
```

The model **must** conform to the schema. If it can't, it returns a refusal instead of garbage.

---

## Core Pattern: Zod as Single Source of Truth

One Zod schema, two consumption paths:

```
Zod Schema (source of truth)
    │
    ├───► z.toJSONSchema() (Zod v4 built-in) ──► Gemini SDK responseJsonSchema
    │
    └───► Native Zod ──► Vercel AI generateText + Output.object
```

> **Note**: This project uses **Zod v4** (`"zod": "^4.4.3"`). The `toJSONSchema()` method is built into Zod v4 — no `zod-to-json-schema` package needed. Older versions of Zod require the separate `zod-to-json-schema` library.

This prevents schema drift between providers — **one change updates both**.

### Example: Invoice Schema

```typescript
// src/invoices/schemas/invoice.zod.ts

const LineItemZodSchema = z.object({
  description: z.string().min(1).trim(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  sku: z.string().trim().optional(),
});

const TaxZodSchema = z.object({
  rate: z.number().min(0).max(1),
  amount: z.number().nonnegative(),
});

const SourceMetaZodSchema = z.object({
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
```

---

## Path 1: Gemini SDK (`@google/genai`)

**Requires**: JSON Schema → `responseJsonSchema`

### Step 1: Convert Zod → JSON Schema

Zod v4 has `toJSONSchema()` built-in — no external library needed.

```typescript
// src/schemas/to-json-schema.ts
import * as z from 'zod';

export function toJsonSchema<T>(zodSchema: z.ZodType<T>): object {
  return z.toJSONSchema(zodSchema, {
    target: 'openapi-3.0',
    unrepresentable: 'any',  // dates become strings
    override: (ctx) => {
      const def = ctx.zodSchema._def;
      if (def?.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
    },
  });
}
```

This lives in `src/schemas/to-json-schema.ts` — wraps Zod v4's native method with date-handling override for OpenAPI compatibility.

### Step 2: Use with Gemini

```typescript
import { GoogleGenAI } from '@google/genai';
import { InvoiceZodSchema } from './invoices/schemas/invoice.zod';
import { toJsonSchema } from './schemas/to-json-schema';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extractWithGemini(text: string) {
  const jsonSchema = toJsonSchema(InvoiceZodSchema);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Extract invoice data from: ${text}`,
    config: {
      responseJsonSchema: jsonSchema,
    },
  });

  // Response is guaranteed to match InvoiceZodSchema
  return JSON.parse(response.text);
}
```

### Key Constraint: No `$ref`

Zod v4's `toJSONSchema()` uses `$ref` by default for nested schemas. Gemini's OpenAPI subset **doesn't resolve `$ref`** — you must inline everything.

```typescript
// WRONG — $ref pointers Gemini can't resolve
z.toJSONSchema(schema)

// CORRECT — inline all definitions (Zod v4 built-in option)
z.toJSONSchema(schema, {
  $refStrategy: 'none',  // Gemini requirement
})
```

---

## Path 2: Vercel AI SDK (`ai` + `@ai-sdk/google`)

**Requires**: Native Zod (no conversion needed)

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { InvoiceZodSchema } from './invoices/schemas/invoice.zod';

async function extractWithVercelAI(text: string) {
  const { object } = await generateText({
    model: google('gemini-2.5-flash'),
    prompt: `Extract invoice data from: ${text}`,
    output: Output.object({ schema: InvoiceZodSchema }),
  });

  return object; // Already typed as InvoiceZod
}
```

Vercel AI accepts Zod directly — no JSON Schema conversion needed. The SDK handles the conversion internally.

---

## Key Gotchas

### 1. Dates — JSON Schema can't represent them

```typescript
// Zod: date type
issueDate: z.date()

// JSON Schema output: string with date-time format
// { "issueDate": { "type": "string", "format": "date-time" } }
```

Your conversion layer must handle this. See `override` in `toJsonSchema()` above.

### 2. Optional vs required

```typescript
// Zod: dueDate is optional
dueDate: z.date().optional()

// JSON Schema: dueDate NOT in required array
// Required array only contains mandatory fields
```

### 3. Enums become string arrays

```typescript
// Zod
currency: z.enum(['USD', 'EUR', 'ARS', 'BRL'])

// JSON Schema
currency: { type: 'string', enum: ['USD', 'EUR', 'ARS', 'BRL'] }
```

### 4. `z.union()` → `anyOf` (may fail)

```typescript
// Zod
const schema = z.union([z.string(), z.number()])

// JSON Schema — Gemini may reject anyOf
{ anyOf: [{ type: 'string' }, { type: 'number' }] }
```

Test unions with your provider. Fallback: flatten the union into a single type.

---

## Project Architecture

```
src/
├── schemas/
│   └── to-json-schema.ts      # Zod → OpenAPI 3.0 converter
├── invoices/
│   ├── schemas/
│   │   └── invoice.zod.ts     # Zod schema (single source)
│   ├── entities/              # Mongoose documents
│   │   ├── invoice.entity.ts  # Compound indexes, embedded docs
│   │   ├── line-item.entity.ts # Embedded (no _id)
│   │   ├── tax.entity.ts
│   │   ├── source-meta.entity.ts
│   │   └── vendor.entity.ts    # Referenced (shared collection)
│   ├── dto/
│   ├── invoices.controller.ts
│   ├── invoices.service.ts
│   └── invoices.module.ts
└── app.module.ts
```

### MongoDB Indexes

```typescript
// Compound unique: vendor + invoiceNumber
InvoiceSchema.index({ vendorId: 1, invoiceNumber: 1 }, { unique: true });

// Compound for date queries
InvoiceSchema.index({ vendorId: 1, issueDate: -1 });

// Multikey index for SKU search inside lineItems
InvoiceSchema.index({ 'lineItems.sku': 1 });
```

### Embed vs Reference Pattern

| Embedded | Referenced |
|----------|------------|
| LineItems (bounded, co-accessed) | Vendor (shared, independently queried) |
| Lives inside Invoice document | Own collection, referenced by `_id` |
| No separate queries | Populated when needed |

---

## Setup

```bash
pnpm install
cp .env.example .env  # Add your API keys
pnpm run start:dev
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection |
| `GEMINI_API_KEY` | Gemini SDK (`@google/genai`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Vercel AI SDK (`@ai-sdk/google`) |

---

## Learning Path

| Phase | What's Built | What You Learn |
|-------|--------------|----------------|
| 1 | NestJS CRUD + Mongoose schemas | NestJS DI, Mongoose decorators, embed vs reference |
| 2 | Extraction endpoints (both providers) | Structured outputs pattern, Zod → JSON Schema conversion |
| 3 | MongoDB aggregations + reporting | Aggregation pipelines, `$lookup`, `$facet`, `$bucket` |
| 4 | Provider comparison docs | DX, cost, latency, error handling tradeoffs |

---

## Further Reading

- [Gemini — Structured Outputs](https://ai.google.dev/gemini-api/docs structured-outputs)
- [Vercel AI — Object Generation](https://sdk.vercel.ai/docs/guides/providers/google)
- [Zod v4 — toJSONSchema](https://zod.dev)
- [MongoDB — Aggregation Pipeline](https://docs.mongodb.com/manual/aggregation/)