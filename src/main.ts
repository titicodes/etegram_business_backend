import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { ResponseTransformerInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filter/filter';
import { ENVIRONMENT } from './common/config/environment';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS setup
  app.enableCors({
    origin: ['http://localhost:3000', 'http://storefrontapp.etegramgroup.com'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Helmet for security
  app.use(helmet());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  /**
   * Interceptors
   */
  app.useGlobalInterceptors(
    new ResponseTransformerInterceptor(app.get(Reflector)),
  );

  /**
   * Global exception filter
   */
  app.useGlobalFilters(new HttpExceptionFilter());

  /**
   * Set global prefix for API routes
   */
  app.setGlobalPrefix('/api');

  /**
   * Global pipes for validation
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Etegram Business')
    .setDescription('Etegram Business API Documentation')
    .setVersion('1.0')
    .addTag('Etegram Business API')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      persistAuthorization: true,
      customSiteTitle: 'ETEGRAM BUS API Docs',
    },
  });

  // Start the server
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(`Server running on: http://0.0.0.0:${ENVIRONMENT.APP.PORT}`);
  console.log('JWT Secret (Application Startup):', process.env.JWT_SECRET);
}
bootstrap();
