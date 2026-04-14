import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiResponse } from '../interfaces/api-response.interface';
import { ResponseUtil } from '../utils/response.util';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response: Response = context.switchToHttp().getResponse();
    const request: Request = context.switchToHttp().getRequest();
    return next.handle().pipe(
      map((data) => {
        // make nestlens data is untouched
        if (
          ['/nestlens', '/__nestlens'].some((p) => request.path.startsWith(p))
        )
          return data;

        // If data is already in our consistent format, return as-is
        if (ResponseUtil.isConsistentResponse(data)) {
          if (data.statusCode != response.statusCode) {
            response.status(data.statusCode);
          }
          return data;
        }
        // Otherwise, wrap it in our success response
        // Replace Message inside payload to outside
        let message: string = 'Success';
        if (data?.message) {
          message = data.message;
          delete data.message;
        }

        return ResponseUtil.success(data, message, response.statusCode);
      }),
    );
  }
}
