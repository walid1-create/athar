import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { MerchantController } from './merchant.controller';
import { AppService } from './app.service';
import { CloudinaryService } from './common/cloudinary.service';
import { MerchantCatalogController } from './merchant-catalog/merchant-catalog.controller';
import { MerchantCatalogService } from './merchant-catalog/merchant-catalog.service';
import { PrismaModule } from './prisma/prisma.module';
import { MerchantIntegrationService } from './merchant.integration.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController, MerchantController, MerchantCatalogController],
  providers: [
    AppService,
    MerchantIntegrationService,
    MerchantCatalogService,
    CloudinaryService,
  ],
})
export class AppModule {}
