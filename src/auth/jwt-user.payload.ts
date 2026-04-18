export type JwtUserPayload =
  | { sub: string; email: string; role: 'SUPER_ADMIN' }
  | {
      sub: string;
      email: string;
      role: 'MERCHANT';
      merchantId: string;
    }
  | { sub: string; email: string; role: 'USER' }
  | { sub: string; email: string; role: 'DRIVER' };
