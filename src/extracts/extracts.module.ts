import { Module } from '@nestjs/common';
import { ExtractsService } from './extracts.service';
import { ExtractsController } from './extract.controller';

@Module({
  controllers: [ExtractsController],
  providers: [ExtractsService],
})
export class ExtractsModule {}
