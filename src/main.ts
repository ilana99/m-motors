import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
