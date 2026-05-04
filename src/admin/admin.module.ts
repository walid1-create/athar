import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DriversModule } from '../drivers/drivers.module';
import { UsersModule } from '../users/users.module';
import { SuperAdminPlatformController } from './super-admin-platform.controller';

@Module({
  imports: [AuthModule, UsersModule, DriversModule],
  controllers: [SuperAdminPlatformController],
})
export class AdminModule {}
