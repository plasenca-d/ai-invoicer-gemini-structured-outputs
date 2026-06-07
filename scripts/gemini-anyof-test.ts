import * as z from 'zod';
import { GoogleGenAI } from '@google/genai';
import { toJsonSchema } from '../src/schemas/to-json-schema';

// Schema con union — lo que genera anyOf
const CurrencySchema = z.union([
  z.enum(['USD', 'EUR', 'ARS', 'BRL']),
  z.object({ code: z.string(), symbol: z.string() }),
]);

const jsonSchema = toJsonSchema(CurrencySchema);
console.log('JSON Schema generado:');
console.log(JSON.stringify(jsonSchema, null, 2));

// Chequeamos si tiene anyOf
const hasAnyOf = JSON.stringify(jsonSchema).includes('anyOf');
console.log(`\n¿Tiene anyOf? ${hasAnyOf ? 'SÍ' : 'NO'}`);

if (!hasAnyOf) {
  console.log('→ z.union() NO genera anyOf. Se puede usar sin drama.');
  process.exit(0);
}

// Si tiene anyOf, probamos contra Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log(
    '\n⚠️ No hay GEMINI_API_KEY. No se puede probar contra el provider real.',
  );
  console.log(
    '→ Asumimos que anyOf podría no funcionar. Recomendación: aplanar union.',
  );
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

console.log('\n🔍 Probando contra Gemini con anyOf...');

const testPrompt = 'Give me a currency object with code "USD" and symbol "$"';

// try {
//   const response = await ai.models.generateContent({
//     model: 'gemini-2.5-flash',
//     contents: testPrompt,
//     config: {
//       responseJsonSchema: jsonSchema,
//     },
//   });

//   console.log('\n✅ Respuesta de Gemini:');
//   console.log(
//     JSON.stringify(response.candidates?.[0]?.content?.parts?.[0], null, 2),
//   );
//   console.log('\n→ anyOf FUNCIONA con Gemini. Se puede usar z.union().');
//   process.exit(0);
// } catch (err: unknown) {
//   const message = err instanceof Error ? err.message : String(err);
//   console.log(`\n❌ Gemini rechazó anyOf:`);
//   console.log(message);
//   console.log('\n→ FALLBACK NECESARIO: aplanar el union.');
//   console.log(
//     '  En InvoiceZodSchema, reemplazar currency: z.union([...]) por dos campos separados.',
//   );
//   process.exit(1);
// }
