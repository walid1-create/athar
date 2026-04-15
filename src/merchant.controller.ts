import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
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
import { MerchantJwtScopeGuard } from './auth/merchant-jwt-scope.guard';
import { MerchantAccountGuard } from './auth/merchant-account.guard';
import { SuperAdminGuard } from './auth/super-admin.guard';
import { EffectiveMerchantId } from './auth/effective-merchant-id.decorator';
import { JwtUserPayload } from './auth/jwt-user.payload';
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
  @UseGuards(JwtAuthGuard, MerchantAccountGuard)
  @ApiOperation({
    summary: 'Update your store profile (merchant login only; id from token)',
  })
  @Patch('me')
  updateMyMerchant(
    @Req() req: { user?: JwtUserPayload },
    @Body() dto: UpdateMerchantDto,
  ) {
    const user = req.user;
    if (!user || user.role !== 'MERCHANT') {
      throw new BadRequestException('Merchant account required');
    }
    return this.merchantIntegrationService.updateMerchant(
      user.merchantId,
      dto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiParam({ name: 'merchantId', type: String })
  @ApiOperation({
    summary:
      'Edit a merchant (super admin). New stores: POST /auth/merchant/register.',
  })
  @Patch('admin/:merchantId')
  updateMerchantAsSuperAdmin(
    @Param('merchantId') merchantId: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantIntegrationService.updateMerchant(merchantId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiParam({ name: 'merchantId', type: String })
  @ApiOperation({ summary: 'Delete merchant (super admin only)' })
  @Delete('admin/:merchantId')
  deleteMerchant(@Param('merchantId') merchantId: string) {
    return this.merchantIntegrationService.deleteMerchant(merchantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, MerchantJwtScopeGuard)
  @ApiOperation({
    summary:
      'List products for your store (merchant JWT only; id from token)',
  })
  @Get('me/products')
  getMerchantProducts(@EffectiveMerchantId() merchantId: string) {
    return this.merchantIntegrationService.getMerchantProducts(merchantId);
  }
}
