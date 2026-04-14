import { Request } from 'express';

import { User } from '../modules/user/user.entity';

declare module 'express-serve-static-core' {
  export interface Request {
    currentUser?: User;
    user?: User;
    session?: {
      userId?: string;
    };
    requestId?: string;
    flash(
      type: 'toast',
      message?: { type: 'success' | 'error'; message: string },
    ): void;
    flash(type: string, message?: string | object): void;
  }
}
