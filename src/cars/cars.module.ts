import { Module } from '@nestjs/common';
import { CarsService } from './cars.service';
import { CarsController } from './cars.controller';
import { CarEntity } from './entities/car.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [CarsController],
  providers: [CarsService],
  imports: [TypeOrmModule.forFeature([CarEntity])],
  exports: [CarsService],
})
export class CarsModule {}
