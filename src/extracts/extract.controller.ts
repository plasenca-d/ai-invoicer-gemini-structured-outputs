import { Body, Controller, Post } from '@nestjs/common';
import { ExtractsService } from './extracts.service';
import { ExtractRequestDto } from './dto/extract-request.dto';

@Controller('extracts')
export class ExtractsController {
  constructor(private readonly extractsService: ExtractsService) {}

  @Post('gemini')
  async extractGemini(@Body() extractRequestDto: ExtractRequestDto) {
    return await this.extractsService.extractGemini(extractRequestDto);
  }
}
