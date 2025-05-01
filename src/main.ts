// import { NestFactory, Reflector } from '@nestjs/core';
// import { AppModule } from './app.module';
// import helmet from 'helmet';
// import * as express from 'express';
// import { ValidationPipe } from '@nestjs/common';
// import { ResponseTransformerInterceptor } from './common/interceptors/response.interceptor';
// import { HttpExceptionFilter } from './common/filter/filter';
// import { ENVIRONMENT } from './common/config/environment';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule)
//   app.enableCors({
//     origin: ['http://localhost:3000', ],
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true,
//   });

//   app.use(helmet());
//   app.use(express.json({ limit: '50mb' }));
//   app.use(express.urlencoded({ limit: '50mb', extended: true }));

//   /**
//    * interceptors
//    */
//   app.useGlobalInterceptors(
//     new ResponseTransformerInterceptor(app.get(Reflector)),
//   );

//   /**
//    * Set global exception filter
//    */
//   app.useGlobalFilters(new HttpExceptionFilter());

//   /**
//    * Set global prefix for routes
//    */
//   app.setGlobalPrefix('/api');

//   /**
//    *  Set global pipes
//    */
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );

//   // Swagger setup
//   const config = new DocumentBuilder()
//     .setTitle('Etegram Businuess')
//     .setDescription('Etegram Business')
//     .setVersion('1.0')
//     .addTag('Etegram Business API')
//     .addBearerAuth(
//       {
//         type: 'http',
//         scheme: 'bearer',
//         bearerFormat: 'JWT',
//         name: 'JWT',
//         description: 'Enter JWT token',
//         in: 'header',
//       },
//       'JWT-auth',
//     )
//     .build();

//   const document = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup('swagger', app, document, {
//     swaggerOptions: {
//       tagsSorter: 'alpha',
//       operationsSorter: 'alpha',
//       persistAuthorization: true,
//       customSiteTitle: `ETEGRAM BUS API Docs`,
//     },
//   });


//   //   await app.listen(8000)
//   //  console.log(`App runing on port 8000`)
//   await app.listen(process.env.PORT || 3000, '0.0.0.0');
//   console.log(`Server running on: http://0.0.0.0:${ENVIRONMENT.APP.PORT}`);
//   console.log('JWT Secret (Application Startup):', process.env.JWT_SECRET);

// }
// bootstrap();

import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { ResponseTransformerInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filter/filter';
import { ENVIRONMENT } from './common/config/environment';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*', // Temporarily allow all origins for testing
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Security settings
  app.use(helmet());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Global interceptors and filters
  app.useGlobalInterceptors(new ResponseTransformerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Set global prefix for routes
  app.setGlobalPrefix('/api');

  // Validation pipe
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
    .setDescription('Etegram Business API')
    .setVersion('1.0')
    .addTag('Etegram Business API')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
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
      customSiteTitle: `ETEGRAM BUS API Docs`,
    },
  });

  // Serve the application over HTTPS
  await app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on: https://0.0.0.0:3000');
  });

  // If using SSL certificates
  const httpsOptions = {
    key: fs.readFileSync('path/to/your/private.key'),
    cert: fs.readFileSync('path/to/your/certificate.crt'),
  };

  // Create the HTTPS server
  await app.listen(3000, '0.0.0.0', () => {
    console.log('Secure server running on: https://0.0.0.0:3000');
  });

  console.log(`Server running on: https://0.0.0.0:${ENVIRONMENT.APP.PORT}`);
}
bootstrap();
