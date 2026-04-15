import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

type RequestWithMerchantScope = Request & {
  effectiveMerchantId?: string;
};

/** Merchant id set on the request by {@link MerchantJwtScopeGuard} (JWT store owner). */
export const EffectiveMerchantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<RequestWithMerchantScope>();
    const id = req.effectiveMerchantId;
    if (!id) {
      throw new BadRequestException('Merchant scope is missing');
    }
    return id;
  },
);
