import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { Observable, map } from 'rxjs';

import { UserDto } from 'src/modules/users/dtos/response/user.dto';

import { ResponseUtil } from '../utils/response.util';

export function Serialize(
  dto: any,
  options?: {
    isPaginated?: boolean;
    injectCurrentUser?: boolean;
  },
) {
  return UseInterceptors(
    new SerializeInterceptor(
      dto,
      options?.isPaginated,
      options?.injectCurrentUser,
    ),
  );
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(
    private dto: any,
    private isPaginated: boolean = false,
    private injectCurrentUser: boolean = false,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(
      map((data: any) => {
        const isConsistent = ResponseUtil.isConsistentResponse(data);
        const source = isConsistent ? data.payload : data;
        let sourceData = this.isPaginated ? source.data : source;
        if (this.injectCurrentUser) {
          sourceData = this.injectUser(sourceData, request.user as UserDto);
        }
        const serialized = plainToInstance(this.dto, sourceData, {
          excludeExtraneousValues: true,
        });

        return isConsistent
          ? {
              // if consistent
              ...data,
              payload: this.isPaginated
                ? { ...source, data: serialized }
                : serialized,
            }
          : this.isPaginated // if not consistent and pagination
            ? { ...source, data: serialized }
            : serialized;
      }),
    );
  }

  injectUser<T>(data: T | T[], currentUser: UserDto): T | T[] {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map((item) => ({
        ...item,
        currentUser,
      }));
    }

    return {
      ...data,
      currentUser,
    };
  }
}
