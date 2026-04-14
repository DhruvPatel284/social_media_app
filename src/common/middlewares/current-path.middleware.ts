import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CurrentPathMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.locals.currentPath = req.path;

    // helper function
    res.locals.isActive = (url: string) => {
        if (url === '/') {
            return req.path === '/';
        }
        if (url === '/admin') {
          return req.path === '/admin';
        }
        if (url === '/user') {
          return req.path === '/user';
        }
      return req.path.startsWith(url);
    };

    next();
  }
}
