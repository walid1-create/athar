import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CloudinaryService } from '../common/cloudinary.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthMerchantController } from './auth-merchant.controller';
import { AuthSuperAdminController } from './auth-super-admin.controller';
import { AuthDriverController } from './auth-driver.controller';
import { AuthUserController } from './auth-user.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { MerchantJwtScopeGuard } from './merchant-jwt-scope.guard';
import { MerchantAccountGuard } from './merchant-account.guard';
import { SuperAdminGuard } from './super-admin.guard';
import { DriverAccountGuard } from './driver-account.guard';
import { UserAccountGuard } from './user-account.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    AuthSuperAdminController,
    AuthMerchantController,
    AuthUserController,
    AuthDriverController,
  ],
  providers: [
    AuthService,
    CloudinaryService,
    JwtStrategy,
    SuperAdminGuard,
    MerchantJwtScopeGuard,
    MerchantAccountGuard,
    UserAccountGuard,
    DriverAccountGuard,
  ],
  exports: [
    AuthService,
    SuperAdminGuard,
    MerchantJwtScopeGuard,
    MerchantAccountGuard,
    UserAccountGuard,
    DriverAccountGuard,
  ],
})
export class AuthModule {}
