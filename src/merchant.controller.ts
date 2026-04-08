import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MerchantType } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './common/cloudinary.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CreateMerchantDto } from './merchant/dto/create-merchant.dto';
import { UpdateMerchantDto } from './merchant/dto/update-merchant.dto';
import { MerchantIntegrationService } from './merchant.integration.service';

@ApiTags('merchants')
@Controller('merchants')
export class MerchantController {
  constructor(
    private readonly merchantIntegrationService: MerchantIntegrationService,
    private readonly cloudinaryService: CloudinaryService,
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
          externalId: 'ext-market-001',
          name: 'Fresh Basket Market',
          merchantType: 'SUPERMARKET',
          websiteUrl: 'https://api.freshbasket.example',
          checkoutBaseUrl: 'https://api.freshbasket.example/checkout',
          productsEndpoint: '/v1/products',
          categoriesEndpoint: '/v1/categories',
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
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create merchant (super admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        merchantType: {
          type: 'string',
          enum: Object.values(MerchantType),
        },
        websiteUrl: { type: 'string' },
        externalId: { type: 'string' },
        checkoutBaseUrl: { type: 'string' },
        productsEndpoint: { type: 'string' },
        categoriesEndpoint: { type: 'string' },
        authType: { type: 'string' },
        authConfig: { type: 'string', description: 'JSON string' },
        isActive: { type: 'boolean' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['name', 'merchantType', 'websiteUrl'],
    },
  })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createMerchant(
    @Body() dto: CreateMerchantDto,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    if (file && Buffer.isBuffer(file.buffer)) {
      dto.imageUrl = await this.cloudinaryService.uploadImage(
        file.buffer,
        'athar/merchants',
      );
    }
    return this.merchantIntegrationService.createMerchant(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit merchant with PATCH (super admin only)' })
  @ApiParam({ name: 'merchantId', type: String })
  @Patch(':merchantId')
  updateMerchant(
    @Param('merchantId') merchantId: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantIntegrationService.updateMerchant(merchantId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete merchant (super admin only)' })
  @ApiParam({ name: 'merchantId', type: String })
  @Delete(':merchantId')
  deleteMerchant(@Param('merchantId') merchantId: string) {
    return this.merchantIntegrationService.deleteMerchant(merchantId);
  }

  @ApiOperation({
    summary:
      'Get merchant products in unified format (name, images, price, optional category)',
  })
  @ApiParam({ name: 'merchantId', type: String })
  @Get(':merchantId/products')
  getMerchantProducts(@Param('merchantId') merchantId: string) {
    return this.merchantIntegrationService.getMerchantProducts(merchantId);
  }
}
