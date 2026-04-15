import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { CloudinaryService } from '../common/cloudinary.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MerchantCatalogService } from './merchant-catalog.service';

/** Super admin manages any store by merchant id in the URL (not for merchant app tokens). */
@ApiTags('Merchant catalog (super admin)')
@ApiBearerAuth()
@Controller('merchants/admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class MerchantCatalogSuperAdminController {
  constructor(
    private readonly catalog: MerchantCatalogService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @ApiOperation({ summary: 'List categories for a merchant' })
  @ApiParam({ name: 'merchantId', type: String })
  @Get(':merchantId/categories')
  listCategories(@Param('merchantId') merchantId: string) {
    return this.catalog.listCategories(merchantId);
  }

  @ApiOperation({ summary: 'Create category' })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        sortOrder: { type: 'integer' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['name'],
    },
  })
  @Post(':merchantId/categories')
  @UseInterceptors(FileInterceptor('file'))
  async createCategory(
    @Param('merchantId') merchantId: string,
    @Body() dto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file?.buffer) {
      imageUrl = await this.cloudinary.uploadImage(
        file.buffer,
        'athar/categories',
      );
    }
    return this.catalog.createCategory(merchantId, dto, imageUrl);
  }

  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiParam({ name: 'categoryId', type: String })
  @Patch(':merchantId/categories/:categoryId')
  updateCategory(
    @Param('merchantId') merchantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalog.updateCategory(merchantId, categoryId, dto);
  }

  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiParam({ name: 'categoryId', type: String })
  @Delete(':merchantId/categories/:categoryId')
  deleteCategory(
    @Param('merchantId') merchantId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.catalog.deleteCategory(merchantId, categoryId);
  }

  @ApiOperation({ summary: 'List products in a category' })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiParam({ name: 'categoryId', type: String })
  @Get(':merchantId/categories/:categoryId/products')
  listProducts(
    @Param('merchantId') merchantId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.catalog.listProducts(merchantId, categoryId);
  }

  @ApiOperation({ summary: 'Create product with main image and optional gallery' })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiParam({ name: 'categoryId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
        description: { type: 'string' },
        file: { type: 'string', format: 'binary' },
        gallery: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['name', 'price'],
    },
  })
  @Post(':merchantId/categories/:categoryId/products')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gallery', maxCount: 24 },
    ]),
  )
  async createProduct(
    @Param('merchantId') merchantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateProductDto,
    @UploadedFiles()
    files?: {
      file?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    const main = files?.file?.[0];
    const gallery = files?.gallery ?? [];
    let mainUrl: string | undefined;
    if (main?.buffer) {
      mainUrl = await this.cloudinary.uploadImage(main.buffer, 'athar/products');
    }
    const galleryUrls: string[] = [];
    for (const g of gallery) {
      if (g.buffer) {
        galleryUrls.push(
          await this.cloudinary.uploadImage(
            g.buffer,
            'athar/products/gallery',
          ),
        );
      }
    }
    return this.catalog.createProduct(
      merchantId,
      categoryId,
      dto,
      mainUrl,
      galleryUrls,
    );
  }

  @ApiOperation({
    summary:
      'Update product (JSON). Use imageUrl / extraImageUrls for images.',
  })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiParam({ name: 'productId', type: String })
  @Patch(':merchantId/products/:productId')
  updateProduct(
    @Param('merchantId') merchantId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalog.updateProduct(merchantId, productId, dto);
  }

  @ApiOperation({ summary: 'Delete product' })
  @ApiParam({ name: 'merchantId', type: String })
  @ApiParam({ name: 'productId', type: String })
  @Delete(':merchantId/products/:productId')
  deleteProduct(
    @Param('merchantId') merchantId: string,
    @Param('productId') productId: string,
  ) {
    return this.catalog.deleteProduct(merchantId, productId);
  }
}
