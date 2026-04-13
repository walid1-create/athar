import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtUserPayload } from './jwt-user.payload';

/**
 * Catalog writes: only `SUPER_ADMIN` (any merchant) or `MERCHANT` (own `merchantId` in URL).
 * Use after {@link JwtAuthGuard}.
 */
@Injectable()
export class MerchantAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      user?: JwtUserPayload;
      params: { merchantId?: string };
    }>();
    const user = req.user;
    const merchantId = req.params.merchantId;

    if (!merchantId) {
      throw new ForbiddenException('Missing merchant id');
    }
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const role = user.role;
    if (role !== 'SUPER_ADMIN' && role !== 'MERCHANT') {
      throw new ForbiddenException(
        'Only merchant accounts and super admins can create, edit, or delete categories and products',
      );
    }

    if (role === 'SUPER_ADMIN') {
      return true;
    }

    if (!user.merchantId) {
      throw new ForbiddenException('Invalid merchant token');
    }
    if (user.merchantId !== merchantId) {
      throw new ForbiddenException('You can only manage your own store');
    }
    return true;
  }
}
