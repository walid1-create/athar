import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtUserPayload } from './jwt-user.payload';

type RequestWithScope = Request & {
  user?: JwtUserPayload;
  effectiveMerchantId?: string;
};

/**
 * Store owner only: requires a merchant JWT and sets `req.effectiveMerchantId`
 * from the token (no path merchant id, no extra headers).
 */
@Injectable()
export class MerchantJwtScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithScope>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.role !== 'MERCHANT' || !user.merchantId) {
      throw new ForbiddenException('Merchant login required');
    }

    req.effectiveMerchantId = user.merchantId;
    return true;
  }
}
