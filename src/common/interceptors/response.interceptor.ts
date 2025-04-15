// import {
//     Injectable,
//     NestInterceptor,
//     ExecutionContext,
//     CallHandler,
//   } from '@nestjs/common';
//   import { Reflector } from '@nestjs/core';
//   import { Observable, map } from 'rxjs';
// import { ResponseMessageKey } from '../constants/decorators/response.decorator';

//   export interface Response<T> {
//     data: T;
//   }

//   @Injectable()
//   export class ResponseTransformerInterceptor<T>
//     implements NestInterceptor<T, Response<T>>
//   {
//     constructor(private reflector: Reflector) {}

//     intercept(
//       context: ExecutionContext,
//       next: CallHandler,
//     ): Observable<Response<T>> {
//       const response = context.switchToHttp().getResponse();
//       const responseMessage =
//         this.reflector.get<string>(ResponseMessageKey, context.getHandler()) ??
//         null;

//       return next.handle().pipe(
//         map((data) => {
//           return {
//             success: response.statusCode === 201 || response.statusCode === 200,
//             data: data,
//             message: responseMessage || 'Request completed successfully',
//           };
//         }),
//       );
//     }
//   }


import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { ResponseMessageKey } from '../constants/decorators/response.decorator';

export interface Response<T> {
  data: T;
}

@Injectable()
export class ResponseTransformerInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();
    const responseMessage = this.reflector.get<string>(ResponseMessageKey, context.getHandler()) ?? null;

    return next.handle().pipe(
      map((data) => {
        console.log("Interceptor Data In: ", data); // Moved inside map callback

        // Check if the returned data is already in the desired format
        if (data && data.success !== undefined && data.data !== undefined && data.message !== undefined) {
          console.log("Interceptor Data Out (No Change): ", data);
          return data; // Return the data as is
        }

        // Otherwise, wrap the data in the standardized structure
        const returnedData = {
          success: response.statusCode === 201 || response.statusCode === 200,
          data: data,
          message: responseMessage || 'Request completed successfully',
        };
        console.log("Interceptor Data Out (Transformed): ", returnedData);
        return returnedData;
      }),
    );
  }
}