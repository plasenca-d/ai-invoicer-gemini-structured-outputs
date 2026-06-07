import * as z from 'zod';

export function toJsonSchema<T>(zodSchema: z.ZodType<T>): object {
  return z.toJSONSchema(zodSchema, {
    target: 'openapi-3.0',
    // Dates are not representable in JSON Schema, so must convert to ISO string
    unrepresentable: 'any',
    override: (ctx) => {
      //
      const def = (ctx.zodSchema as unknown as { _def?: { type?: string } })
        ._def;

      if (def?.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
    },
  });
}
