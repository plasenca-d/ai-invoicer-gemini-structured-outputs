import { Test, TestingModule } from '@nestjs/testing';
import { ExtractsService } from './extracts.service';

describe('ExtractsService', () => {
  let service: ExtractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtractsService],
    }).compile();

    service = module.get<ExtractsService>(ExtractsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
