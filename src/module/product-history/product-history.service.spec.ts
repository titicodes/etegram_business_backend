import { Test, TestingModule } from '@nestjs/testing';
import { ProductHistoryService } from './product-history.service';

describe('ProductHistoryService', () => {
  let service: ProductHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductHistoryService],
    }).compile();

    service = module.get<ProductHistoryService>(ProductHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
