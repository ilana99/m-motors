import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { LoggingInterceptor } from './logging/logging.interceptor';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(cookieParser());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'https://m-motors-frontend.onrender.com',
      'https://m-motors-backoffice.onrender.com',
      /^https:\/\/m-motors-frontend-pr-\d+\.onrender\.com$/,
      /^https:\/\/m-motors-backoffice-pr-\d+\.onrender\.com$/,
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
