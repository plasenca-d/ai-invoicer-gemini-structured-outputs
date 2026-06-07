import * as z from 'zod';

interface ToJsonSchemaOptions {
  example?: Record<any, any> | undefined;
}

export function toJsonSchema<T>(
  zodSchema: z.ZodType<T>,
  options?: ToJsonSchemaOptions,
): object {
  const schema = z.toJSONSchema(zodSchema, {
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

      if (ctx.jsonSchema.exclusiveMinimum === true) {
        ctx.jsonSchema.exclusiveMinimum = 0;
      }
      if (ctx.jsonSchema.exclusiveMaximum === true) {
        ctx.jsonSchema.exclusiveMaximum = 999999999;
      }
    },
  });

  if (options?.example) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (schema as any).example = options.example;
  }

  return schema;
}
