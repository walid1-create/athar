import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { MerchantController } from './merchant.controller';
import { AppService } from './app.service';
import { CloudinaryService } from './common/cloudinary.service';
import { PrismaModule } from './prisma/prisma.module';
import { MerchantIntegrationService } from './merchant.integration.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController, MerchantController],
  providers: [AppService, MerchantIntegrationService, CloudinaryService],
})
export class AppModule {}
