import { randomUUID } from 'crypto';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { Request, Response } from 'express';

import { ApiResponse } from '../interfaces/api-response.interface';
import { ResponseUtil } from '../utils/response.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = randomUUID();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let payload: any = null;

    // Log the exception for debugging
    if (process.env.NODE_ENV === 'development') {
      this.logException(exception, request, requestId);
    }

    const isApiRequest =
      request.originalUrl?.startsWith('/api') ||
      request.headers.accept?.includes('application/json') ||
      request.xhr ||
      request.headers['x-requested-with'] === 'XMLHttpRequest';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      // Check if the response is already in our desired format
      if (
        ResponseUtil.isConsistentResponse(exceptionResponse) &&
        !(!isApiRequest && status === HttpStatus.BAD_REQUEST)
      ) {
        return this.doResponse(response, status, exceptionResponse);
      }

      // Extract message and payload from HttpException
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || message;

        payload = (exceptionResponse as any).payload || exceptionResponse;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      payload = {
        name: exception.name,
        stack:
          process.env.NODE_ENV === 'development' ? exception.stack : undefined,
      };
    }

    if (status === HttpStatus.BAD_REQUEST) {
      message = payload.message || 'Validation Error';

      if (!isApiRequest) {
        request.flash('oldInputs', request.body);
        request.flash('errors', payload);
        return response.redirect(
          request.get('Referer') || request.originalUrl || '/',
        );
      }
    }

    // This for redirecting unauthorized to login page for web dashboard
    if (!isApiRequest && status === HttpStatus.UNAUTHORIZED) {
      return response.redirect('/login');
    }

    // Create consistent error response based on status code
    const errorResponse = this.createErrorResponse(
      status,
      message,
      payload,
      requestId,
    );
    return this.doResponse(response, status, errorResponse);
  }

  private doResponse(
    response: Response,
    status: HttpStatus,
    errorResponse: ApiResponse,
  ) {
    // Check if response has already been sent
    if (response.headersSent) {
      return;
    }

    let responseStatus = errorResponse.statusCode;

    if (status === HttpStatus.BAD_REQUEST) {
      responseStatus = 200;
    }

    return response.status(responseStatus).json(errorResponse);
  }

  private createErrorResponse(
    statusCode: number,
    message: string,
    payload: any,
    requestId: string,
  ) {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ResponseUtil.error(
          message,
          HttpStatus.BAD_REQUEST,
          payload,
          requestId,
        );
      case HttpStatus.UNAUTHORIZED:
        return ResponseUtil.unauthorized(message, payload, requestId);
      case HttpStatus.FORBIDDEN:
        return ResponseUtil.forbidden(message, payload, requestId);
      case HttpStatus.NOT_FOUND:
        return ResponseUtil.notFound(message, payload, requestId);
      case HttpStatus.GATEWAY_TIMEOUT:
        return ResponseUtil.gatewayTimeout(message, payload, requestId);
      case HttpStatus.INTERNAL_SERVER_ERROR:
      default:
        return ResponseUtil.serverError(
          message,
          statusCode,
          payload,
          requestId,
        );
    }
  }

  private logException(
    exception: unknown,
    request: Request,
    requestId: string,
  ) {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    this.logger.error(`Exception occurred - RequestId: ${requestId}`, {
      exception: exception instanceof Error ? exception.stack : exception,
      request: {
        method,
        url,
        ip,
        userAgent,
      },
    });
  }
}
