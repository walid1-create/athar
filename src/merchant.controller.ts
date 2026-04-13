import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MerchantType } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SuperAdminGuard } from './auth/super-admin.guard';
import { UpdateMerchantDto } from './merchant/dto/update-merchant.dto';
import { MerchantIntegrationService } from './merchant.integration.service';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantController {
  constructor(
    private readonly merchantIntegrationService: MerchantIntegrationService,
  ) {}

  @ApiOperation({ summary: 'Get all merchants' })
  @ApiQuery({
    name: 'merchantType',
    required: false,
    enum: MerchantType,
    description: 'Optional filter by merchant type',
  })
  @ApiOkResponse({
    description: 'List all merchants configured in database',
    schema: {
      example: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Fresh Basket Market',
          merchantType: 'SUPERMARKET',
          imageUrl: 'https://example.com/merchant.jpg',
          isActive: true,
          createdAt: '2026-04-07T11:00:00.000Z',
          updatedAt: '2026-04-07T11:00:00.000Z',
        },
      ],
    },
  })
  @Get()
  getMerchants(@Query('merchantType') merchantType?: string) {
    if (
      merchantType &&
      !Object.values(MerchantType).includes(merchantType as MerchantType)
    ) {
      throw new BadRequestException(
        `Invalid merchantType. Allowed values: ${Object.values(MerchantType).join(', ')}`,
      );
    }
    return this.merchantIntegrationService.getMerchants(
      merchantType as MerchantType | undefined,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({
    summary:
      'Edit merchant (super admin). New stores: POST /auth/merchant/register.',
  })
  @ApiParam({ name: 'merchantId', type: String })
  @Patch(':merchantId')
  updateMerchant(
    @Param('merchantId') merchantId: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantIntegrationService.updateMerchant(merchantId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Delete merchant (super admin only)' })
  @ApiParam({ name: 'merchantId', type: String })
  @Delete(':merchantId')
  deleteMerchant(@Param('merchantId') merchantId: string) {
    return this.merchantIntegrationService.deleteMerchant(merchantId);
  }

  @ApiOperation({
    summary:
      'Get merchant products from database (name, description, images, price, category name)',
  })
  @ApiParam({ name: 'merchantId', type: String })
  @Get(':merchantId/products')
  getMerchantProducts(@Param('merchantId') merchantId: string) {
    return this.merchantIntegrationService.getMerchantProducts(merchantId);
  }
}
