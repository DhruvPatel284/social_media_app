import { randomUUID } from 'crypto';

import { ValidationError } from '@nestjs/common';

import { Paginated } from 'nestjs-paginate';

import { ApiResponse } from '../interfaces/api-response.interface';

export class ResponseUtil {
  private static createBaseResponse<T>(
    result: boolean,
    statusCode: number,
    message: string,
    payload: T,
    requestId?: string,
    meta?: any,
    links?: any,
  ): ApiResponse<T> {
    const wrappedPayload = Array.isArray(payload)
      ? ({ data: payload } as any)
      : payload;

    return {
      requestId: requestId || randomUUID(),
      result,
      statusCode,
      message,
      payload: wrappedPayload,
      ...(meta && { meta }),
      ...(links && { links }),
    };
  }

  static success<T>(
    data: T,
    message = 'Success',
    statusCode = 200,
    requestId?: string,
  ): ApiResponse<T> {
    return this.createBaseResponse(true, statusCode, message, data, requestId);
  }

  static error<T = any>(
    message = 'Error',
    statusCode = 400,
    payload: T = null as any,
    requestId?: string,
  ): ApiResponse<T> {
    return this.createBaseResponse(
      false,
      statusCode,
      message,
      payload,
      requestId,
    );
  }

  static serverError<T = any>(
    message = 'Internal Server Error',
    statusCode = 500,
    payload: T = null as any,
    requestId?: string,
  ): ApiResponse<T> {
    return this.createBaseResponse(
      false,
      statusCode,
      message,
      payload,
      requestId,
    );
  }

  static unauthorized(
    message = 'Unauthorized',
    payload: any = null,
    requestId?: string,
  ): ApiResponse {
    return this.createBaseResponse(false, 401, message, payload, requestId);
  }

  static forbidden(
    message = 'Forbidden',
    payload: any = null,
    requestId?: string,
  ): ApiResponse {
    return this.createBaseResponse(false, 403, message, payload, requestId);
  }

  static notFound(
    message = 'Not Found',
    payload: any = null,
    requestId?: string,
  ): ApiResponse {
    return this.createBaseResponse(false, 404, message, payload, requestId);
  }

  static gatewayTimeout(
    message = 'Gateway Timeout',
    payload: any = null,
    requestId?: string,
  ): ApiResponse {
    return this.createBaseResponse(false, 504, message, payload, requestId);
  }

  static paginate<T>(
    pagination: Paginated<T>,
    message = 'Success',
    statusCode = 200,
    requestId?: string,
  ): ApiResponse<T[]> {
    return this.createBaseResponse(
      true,
      statusCode,
      message,
      pagination.data,
      requestId,
      pagination.meta,
      pagination.links,
    );
  }

  static validationError(
    errors: Record<string, string[]>,
    message = 'Validation failed',
    requestId?: string,
  ): ApiResponse {
    return this.createBaseResponse(false, 200, message, errors, requestId);
  }

  static isConsistentResponse(response: any): response is ApiResponse {
    return (
      typeof response === 'object' &&
      response !== null &&
      'requestId' in response &&
      'result' in response &&
      'statusCode' in response &&
      'message' in response &&
      'payload' in response
    );
  }

  static formatErrors(errors: ValidationError[]) {
    const result: Record<string, string[]> = {};

    function extractErrors(err: ValidationError, parentKey = ''): void {
      const key = parentKey ? `${parentKey}.${err.property}` : err.property;

      if (err.constraints) {
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(...Object.values(err.constraints));
      }

      if (err.children && err.children.length > 0) {
        err.children.forEach((child) => {
          extractErrors(child, key);
        });
      }
    }

    errors.forEach((err) => extractErrors(err));

    return result;
  }
}
