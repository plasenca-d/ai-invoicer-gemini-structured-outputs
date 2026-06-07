import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class SourceMeta {
  @Prop({
    required: true,
    enum: ['gemini', 'vercel-ai'],
  })
  provider: 'gemini' | 'vercel-ai';

  @Prop({
    required: true,
    enum: ['text', 'image', 'ocr_text'],
  })
  modality: 'text' | 'image' | 'ocr_text';

  @Prop({
    required: true,
  })
  extractedAt: Date;
}

export const SourceMetaSchema = SchemaFactory.createForClass(SourceMeta);

SourceMetaSchema.set('_id', false);
