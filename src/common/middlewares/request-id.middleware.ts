import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use existing request ID from header or generate new one
    req.id = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  }
}
