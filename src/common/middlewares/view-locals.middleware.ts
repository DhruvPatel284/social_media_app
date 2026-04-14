import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class ViewLocalsMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // if authUser needed in View Locals
    // if (req.session?.userId) {
    //   const user = await this.usersService.findOneUser(
    //     undefined,
    //     req.session.userId,
    //   );
    //   if (user) {
    //     res.locals.authUser = {
    //       id: user.id,
    //       name: user.name,
    //     };
    //   }
    // }
    res.locals.errors = req.flash('errors')[0];
    res.locals.oldInputs = req.flash('oldInputs')[0];

    res.locals.toast = req.flash('toast');
    next();
  }
}
