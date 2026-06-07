import { Injectable } from '@nestjs/common';
import { ExtractRequestDto } from './dto/extract-request.dto';
import { GoogleGenAI } from '@google/genai';
import { envs } from 'src/config/envs';
import { InvoiceZodSchema } from 'src/invoices/schemas/invoice.zod';
import { toJsonSchema } from 'src/schemas/to-json-schema';

const ai = new GoogleGenAI({
  apiKey: envs.GEMINI_API_KEY,
});

const SYSTEM_INSTRUCTION =
  'You are a JSON generator. You MUST respond ONLY with valid JSON that matches ' +
  'the provided schema. Do NOT return empty objects. Do NOT return null values. ' +
  'Every required field must be populated. Use reasonable default values if uncertain. ' +
  'Do NOT include any text before or after the JSON.';

@Injectable()
export class ExtractsService {
  async extractGemini(extractRequestDto: ExtractRequestDto) {
    const { modality, payload } = extractRequestDto;
    const contents = this.normalizePayload(modality, payload);

    const schema = toJsonSchema(InvoiceZodSchema, {
      example: {
        vendorId: 'UNKNOWN',
        invoiceNumber: 'INV-001',
        issueDate: new Date().toISOString(),
        lineItems: [
          { description: 'unknown', quantity: 1, unitPrice: 0, total: 0 },
        ],
        subtotal: 0,
        tax: { rate: 0, amount: 0 },
        total: 0,
        currency: 'USD',
        source: {
          provider: 'gemini',
          modality: 'text',
          extractedAt: new Date().toISOString(),
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseSchema: schema,
        responseMimeType: 'application/json',
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const rawText =
      response.candidates?.at(0)?.content?.parts?.at(0)?.text ?? '';

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(`Gemini no devolvió JSON válido: ${rawText}`);
    }

    console.log({
      parsed,
    });

    const result = InvoiceZodSchema.safeParse(parsed);

    if (!result.success) {
      console.error('❌ Zod parse failed. Raw:', parsed);
      throw new Error(
        `Invalid Invoice structure: ${JSON.stringify(result.error.issues)}`,
      );
    }

    return result.data;
  }

  private normalizePayload(
    modality: 'text' | 'image' | 'ocr_text',
    payload: string,
  ): string {
    switch (modality) {
      case 'text':
        return payload;
      case 'ocr_text':
        return `Texto extraído de OCR. Generá la Invoice correspondiente:\n${payload}`;
      case 'image':
        // image comes as URI data
        return payload;
      default:
        return payload;
    }
  }
}
