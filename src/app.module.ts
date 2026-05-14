import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { UserEntity } from './user/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CarsModule } from './cars/cars.module';
import { CarEntity } from './cars/entities/car.entity';
import { ClientfileModule } from './clientfile/clientfile.module';
import { ClientFileEntity } from './clientfile/entities/clientfile.entity';
import { SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { SentryExceptionFilter } from './utilities/sentry/sentry-exception.filter';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.SUPABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false,
      entities: [UserEntity, CarEntity, ClientFileEntity],
      synchronize: false,
    }),
    UserModule,
    AuthModule,
    CarsModule,
    ClientfileModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
})
export class AppModule { }
