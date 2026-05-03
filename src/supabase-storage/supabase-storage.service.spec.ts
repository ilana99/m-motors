import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseStorageService } from './supabase-storage.service';

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;

  beforeEach(async () => {
    process.env.SUPABASE_PROJECT_URL = 'https://example.supabase.co';
    process.env.SUPABASE_API_KEY = 'test-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [SupabaseStorageService],
    }).compile();

    service = module.get<SupabaseStorageService>(SupabaseStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
