// This Guard is for Web Controllers
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.session?.userId) {
      return true;
    }

    const isApi = request.url.startsWith('/api');

    if (isApi) {
      throw new UnauthorizedException();
    }

    throw new UnauthorizedException();
  }
}
