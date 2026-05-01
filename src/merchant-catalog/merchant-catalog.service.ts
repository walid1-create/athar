import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UnifiedProduct } from '../merchant/catalog.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class MerchantCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnifiedProductsForMerchant(
    merchantId: string,
  ): Promise<UnifiedProduct[]> {
    await this.assertMerchantActive(merchantId);

    const rows = await this.prisma.product.findMany({
      where: { category: { merchantId } },
      include: {
        category: { select: { name: true, nameAr: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      description: p.description,
      descriptionAr: p.descriptionAr,
      price: Number(p.price),
      discountPrice: p.discountPrice !== null ? Number(p.discountPrice) : null,
      category: p.category.name,
      categoryAr: p.category.nameAr,
      images: this.collectImageUrls(
        p.imageUrl,
        p.images.map((i) => i.url),
      ),
    }));
  }

  async listCategories(merchantId: string) {
    await this.assertMerchantActive(merchantId);
    return this.prisma.merchantCategory.findMany({
      where: { merchantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(
    merchantId: string,
    dto: CreateCategoryDto,
    imageUrl?: string,
  ) {
    await this.assertMerchantExists(merchantId);
    return this.prisma.merchantCategory.create({
      data: {
        merchantId,
        name: dto.name,
        description: dto.description,
        nameAr: dto.nameAr,
        descriptionAr: dto.descriptionAr,
        imageUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(
    merchantId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    await this.assertMerchantExists(merchantId);
    const existing = await this.prisma.merchantCategory.findFirst({
      where: { id: categoryId, merchantId },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma.merchantCategory.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        description: dto.description,
        nameAr: dto.nameAr,
        descriptionAr: dto.descriptionAr,
        sortOrder: dto.sortOrder,
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      },
    });
  }

  async deleteCategory(merchantId: string, categoryId: string) {
    await this.assertMerchantExists(merchantId);
    const existing = await this.prisma.merchantCategory.findFirst({
      where: { id: categoryId, merchantId },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    await this.prisma.merchantCategory.delete({ where: { id: categoryId } });
    return { message: 'Category deleted' };
  }

  async listProducts(merchantId: string, categoryId: string) {
    await this.assertMerchantActive(merchantId);
    const category = await this.prisma.merchantCategory.findFirst({
      where: { id: categoryId, merchantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    const rows = await this.prisma.product.findMany({
      where: { categoryId },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ name: 'asc' }],
    });
    return rows.map((p) => ({
      ...p,
      price: Number(p.price),
      discountPrice: p.discountPrice !== null ? Number(p.discountPrice) : null,
    }));
  }

  async listAllProducts(merchantId: string, categoryId?: string) {
    await this.assertMerchantActive(merchantId);

    if (categoryId !== undefined && categoryId !== '') {
      const category = await this.prisma.merchantCategory.findFirst({
        where: { id: categoryId, merchantId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const rows = await this.prisma.product.findMany({
      where: {
        category: { merchantId },
        ...(categoryId !== undefined && categoryId !== ''
          ? { categoryId }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true, nameAr: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
    return rows.map((p) => ({
      ...p,
      price: Number(p.price),
      discountPrice: p.discountPrice !== null ? Number(p.discountPrice) : null,
      category: p.category,
    }));
  }

  async createProduct(
    merchantId: string,
    categoryId: string,
    dto: CreateProductDto,
    mainImageUrl?: string,
    galleryUrls: string[] = [],
  ) {
    await this.assertMerchantExists(merchantId);
    const category = await this.prisma.merchantCategory.findFirst({
      where: { id: categoryId, merchantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    this.assertDiscountNotAbovePrice(dto.price, dto.discountPrice);

    const created = await this.prisma.product.create({
      data: {
        categoryId,
        name: dto.name,
        description: dto.description,
        nameAr: dto.nameAr,
        descriptionAr: dto.descriptionAr,
        price: new Prisma.Decimal(dto.price),
        discountPrice:
          dto.discountPrice !== undefined
            ? new Prisma.Decimal(Number(dto.discountPrice))
            : undefined,
        imageUrl: mainImageUrl,
        images: {
          create: galleryUrls.map((url, sortOrder) => ({ url, sortOrder })),
        },
      },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    return {
      ...created,
      price: Number(created.price),
      discountPrice:
        created.discountPrice !== null ? Number(created.discountPrice) : null,
    };
  }

  async updateProduct(
    merchantId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    await this.assertMerchantExists(merchantId);
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        category: { merchantId },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const effectivePrice =
      dto.price !== undefined ? Number(dto.price) : Number(product.price);
    let effectiveDiscount: number | null;
    if (dto.discountPrice !== undefined) {
      effectiveDiscount =
        dto.discountPrice === null ? null : Number(dto.discountPrice);
    } else {
      effectiveDiscount =
        product.discountPrice !== null ? Number(product.discountPrice) : null;
    }
    this.assertDiscountNotAbovePrice(effectivePrice, effectiveDiscount);

    const { extraImageUrls, imageUrl, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (extraImageUrls !== undefined) {
        await tx.productImage.deleteMany({ where: { productId } });
        if (extraImageUrls.length > 0) {
          await tx.productImage.createMany({
            data: extraImageUrls.map((url, sortOrder) => ({
              productId,
              url,
              sortOrder,
            })),
          });
        }
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          name: rest.name,
          description: rest.description,
          nameAr: rest.nameAr,
          descriptionAr: rest.descriptionAr,
          price:
            rest.price !== undefined
              ? new Prisma.Decimal(rest.price)
              : undefined,
          discountPrice:
            rest.discountPrice !== undefined
              ? new Prisma.Decimal(Number(rest.discountPrice))
              : undefined,
          ...(imageUrl !== undefined ? { imageUrl } : {}),
        },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
      return {
        ...updated,
        price: Number(updated.price),
        discountPrice:
          updated.discountPrice !== null ? Number(updated.discountPrice) : null,
      };
    });
  }

  async deleteProduct(merchantId: string, productId: string) {
    await this.assertMerchantExists(merchantId);
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        category: { merchantId },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    await this.prisma.product.delete({ where: { id: productId } });
    return { message: 'Product deleted' };
  }

  private assertDiscountNotAbovePrice(
    price: number,
    discountPrice?: number | null,
  ): void {
    if (discountPrice === undefined || discountPrice === null) {
      return;
    }
    if (Number(discountPrice) > Number(price)) {
      throw new BadRequestException(
        'discountPrice cannot be greater than price',
      );
    }
  }

  private collectImageUrls(main: string | null, extras: string[]): string[] {
    const out: string[] = [];
    if (main) {
      out.push(main);
    }
    for (const u of extras) {
      if (u && !out.includes(u)) {
        out.push(u);
      }
    }
    return out;
  }

  private async assertMerchantActive(merchantId: string): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { isActive: true },
    });
    if (!merchant?.isActive) {
      throw new NotFoundException('Merchant not found or inactive');
    }
  }

  private async assertMerchantExists(merchantId: string): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
  }
}
