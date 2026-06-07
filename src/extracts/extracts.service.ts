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
  'the provided schema. Do NOT include any text before or after the JSON. ' +
  'Do NOT use markdown code blocks. Do NOT explain your answer. Only output the JSON.';

@Injectable()
export class ExtractsService {
  async extractGemini(extractRequestDto: ExtractRequestDto) {
    const { modality, payload } = extractRequestDto;
    const contents = this.buildPrompt(modality, payload);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        // responseJsonSchema: toJsonSchema(InvoiceZodSchema),
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

    // return InvoiceZodSchema.parse(parsed);
    return rawText;
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

  private buildPrompt(
    modality: 'text' | 'image' | 'ocr_text',
    payload: string,
  ): string {
    const basePrompt = this.normalizePayload(modality, payload);

    return `
  Invoice text:
  ${basePrompt}

  Extract a JSON invoice object with these fields:
  - vendorId: string (use "UNKNOWN" if not found)
  - invoiceNumber: string (use "UNKNOWN" if not found)
  - issueDate: ISO 8601 date string (use today if not found)
  - dueDate: ISO date string (optional, omit if not found)
  - lineItems: array with at least one item. Each item has:
    - description: string
    - quantity: positive integer
    - unitPrice: non-negative number
    - total: non-negative number
    - sku: string (optional, omit if not found)
  - subtotal: number (sum of lineItems totals, or 0 if not calculable)
  - tax: object with rate (0-1) and amount (non-negative number)
  - total: number (subtotal + tax.amount, or 0 if not calculable)
  - currency: string (USD, EUR, ARS, or BRL; default USD)
  - source: object with provider ("gemini"), modality, and extractedAt (ISO date)

  If any field cannot be determined from the text, use the default value shown above.
  Respond ONLY with the JSON object. No markdown, no code blocks, no explanations.
  `.trim();
  }
}
