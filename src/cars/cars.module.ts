import { Module } from '@nestjs/common';
import { CarsService } from './cars.service';
import { CarsController } from './cars.controller';
import { CarEntity } from './entities/car.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service';

@Module({
  controllers: [CarsController],
  providers: [CarsService, SupabaseStorageService],
  imports: [TypeOrmModule.forFeature([CarEntity])],
  exports: [CarsService],
})
export class CarsModule {}
