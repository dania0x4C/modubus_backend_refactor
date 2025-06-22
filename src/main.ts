import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/exceptions/http-exception';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 글로벌 설정
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // 보안 / 성능 / CORS
  app.use(compression());
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger 설정
  const swaggerOptions = new DocumentBuilder()
    .setTitle('소울메이트 API')
    .setDescription('소울메이트 백엔드 API 문서')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('api-docs', app, document);

  // 포트 오픈
  const port = Number(process.env.PORT);
  await app.listen(port, '0.0.0.0');

  console.log(`애플리케이션 실행: http://localhost:${port}`);
  console.log(`문서 확인: http://localhost:${port}/api-docs`);
}

bootstrap();
