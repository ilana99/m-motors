import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { LoggingInterceptor } from './utilities/logging/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
      'https://m-motors-backoffice-staging.onrender.com',
      'https://m-motors-frontend-staging.onrender.com',
    ],
    credentials: true,
  });
  const config = new DocumentBuilder()
    .addCookieAuth('access_token')
    .setTitle('M-motors API')
    .setDescription('API pour M-motors (employé et client)')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
