import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { MerchantAccountGuard } from './auth/merchant-account.guard';
import { SuperAdminGuard } from './auth/super-admin.guard';
import { JwtUserPayload } from './auth/jwt-user.payload';
import { SetMerchantActiveDto } from './merchant/dto/set-merchant-active.dto';
import { UpdateMerchantDto } from './merchant/dto/update-merchant.dto';
import { MerchantCatalogService } from './merchant-catalog/merchant-catalog.service';
import { MerchantIntegrationService } from './merchant.integration.service';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantController {
  constructor(
    private readonly merchantIntegrationService: MerchantIntegrationService,
    private readonly merchantCatalogService: MerchantCatalogService,
  ) {}

  @ApiOperation({ summary: 'Get all merchants' })
  @ApiQuery({
    name: 'merchantType',
    required: false,
    description:
      'Optional filter by merchant type code (e.g. SUPERMARKET). See GET /merchant-types.',
  })
  @ApiOkResponse({
    description: 'List all merchants configured in database',
    schema: {
      example: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Fresh Basket Market',
          merchantTypeId: 'a0000000-0000-4000-8000-000000000001',
          merchantType: 'SUPERMARKET',
          logoUrl: 'https://example.com/merchant-logo.jpg',
          coverImageUrl: 'https://example.com/merchant-cover.jpg',
          isActive: true,
          createdAt: '2026-04-07T11:00:00.000Z',
          updatedAt: '2026-04-07T11:00:00.000Z',
        },
      ],
    },
  })
  @Get()
  getMerchants(@Query('merchantType') merchantType?: string) {
    return this.merchantIntegrationService.getMerchants(merchantType);
  }

  @ApiOperation({
    summary:
      'List discounted products across all active merchants (on sale: discount price below list price)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('products/discounts')
  listDiscountedProductsAcrossMerchants(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.merchantCatalogService.listDiscountedProductsAcrossMerchants(
      page,
      limit,
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
  @UseGuards(JwtAuthGuard, MerchantAccountGuard)
  @ApiOperation({
    summary: 'Open/close your store (merchant login only)',
  })
  @Patch('me/active')
  setMyMerchantActive(
    @Req() req: { user?: JwtUserPayload },
    @Body() dto: SetMerchantActiveDto,
  ) {
    const user = req.user;
    if (!user || user.role !== 'MERCHANT') {
      throw new BadRequestException('Merchant account required');
    }
    return this.merchantIntegrationService.setMerchantActive(
      user.merchantId,
      dto.isActive,
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
}
