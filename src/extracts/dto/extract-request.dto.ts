import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class ExtractRequestDto {
  @IsEnum(['text', 'image', 'ocr_text'])
  modality: 'text' | 'image' | 'ocr_text';

  @IsString()
  @IsNotEmpty()
  payload: string;
}
