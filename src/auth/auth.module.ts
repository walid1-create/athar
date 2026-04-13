import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthMerchantController } from './auth-merchant.controller';
import { AuthSuperAdminController } from './auth-super-admin.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { MerchantAccessGuard } from './merchant-access.guard';
import { SuperAdminGuard } from './super-admin.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthSuperAdminController, AuthMerchantController],
  providers: [AuthService, JwtStrategy, SuperAdminGuard, MerchantAccessGuard],
  exports: [AuthService, SuperAdminGuard, MerchantAccessGuard],
})
export class AuthModule {}
