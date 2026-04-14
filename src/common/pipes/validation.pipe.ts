import { randomUUID } from 'crypto';

import {
  ArgumentMetadata,
  BadRequestException,
  Inject,
  Injectable,
  PipeTransform,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';

import { ResponseUtil } from '../utils/response.util';

// Delete if Possible. Use Custom Pipe only when needed. This makes things complex
@Injectable({ scope: Scope.REQUEST })
export class CustomValidationPipe implements PipeTransform<any> {
  constructor(
    @Inject(REQUEST) private readonly request: Request & { res: Response },
  ) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype, type } = metadata;

    // Skip validation for custom decorators
    if (type === 'custom') return value;

    // Check for empty body
    if (type === 'body') {
      const bodyData = value ?? this.request.body;
      const keys = Object.keys(bodyData || {}).filter((k) => k !== '_method');

      if (keys.length === 0) {
        throw new BadRequestException('Request body cannot be empty');
      }

      // if (!value) value = bodyData;
    }
    if (!metatype || !this.shouldValidate(metatype)) {
      return value;
    }
    // Already validated or injected instance
    if (value?.constructor === metatype) {
      return value;
    }

    // Nullish values skip validation — helps with optional fields
    if (value === null || value === undefined) {
      return value;
    }

    const isApiRequest =
      this.request.originalUrl?.startsWith('/api') ||
      this.request.headers.accept?.includes('application/json') ||
      this.request.xhr ||
      this.request.headers['x-requested-with'] === 'XMLHttpRequest';

    const instance = plainToInstance(metatype, value, {
      enableImplicitConversion: true,
    });

    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (!errors.length) return instance;

    const requestId = randomUUID();

    // Web request with redirect
    if (!isApiRequest) {
      this.request.flash('error', ResponseUtil.formatErrors(errors));
      this.request.flash('oldInput', this.request.body);

      const referer = this.request.get('Referer') || '/';

      if (!this.request.res.headersSent) {
        this.request.res.redirect(referer);
      }

      // throw new HandledRedirectException();
    }

    // Format for API
    const formattedErrors: any = errors.map((err) => ({
      field: err.property,
      errors: Object.values(err.constraints ?? {}),
    }));

    const message =
      formattedErrors[0]?.errors?.[0] || 'Validation error occurred';

    throw new BadRequestException(
      ResponseUtil.validationError(formattedErrors, message, requestId),
    );
  }

  private shouldValidate(metatype: unknown): boolean {
    const noValidationTypes: Function[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return (
      typeof metatype === 'function' && !noValidationTypes.includes(metatype)
    );
  }
}
