import { AuthGuard } from '@nestjs/passport';

export class JwtAuthGuard extends AuthGuard('my-jwt') {}
