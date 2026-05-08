import { Module } from '@nestjs/common';
import { ClientfileService } from './clientfile.service';
import { ClientfileController } from './clientfile.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientFileEntity } from './entities/clientfile.entity';
import { SupabaseStorageService } from '../utilities/supabase-storage/supabase-storage.service';
import { CarEntity } from '../cars/entities/car.entity';

@Module({
  controllers: [ClientfileController],
  providers: [ClientfileService, SupabaseStorageService],
  imports: [TypeOrmModule.forFeature([ClientFileEntity, CarEntity])],
})
export class ClientfileModule { }
