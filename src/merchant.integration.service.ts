import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { MerchantType, PrismaClient } from '@prisma/client';
import { hashPassword } from './common/hash-password';
import { UnifiedProduct } from './merchant/catalog.types';
import { UpdateMerchantDto } from './merchant/dto/update-merchant.dto';
import { MerchantCatalogService } from './merchant-catalog/merchant-catalog.service';
import { PrismaService } from './prisma/prisma.service';

export type MerchantListItem = {
  id: string;
  name: string;
  merchantType: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MerchantIntegrationService {
  private readonly db: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: MerchantCatalogService,
  ) {
    this.db = prisma as unknown as PrismaClient;
  }

  async getMerchants(merchantType?: MerchantType): Promise<MerchantListItem[]> {
    const whereClause = merchantType
      ? ({ merchantType } as { merchantType: MerchantType })
      : undefined;
    return this.db.merchant.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        merchantType: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<MerchantListItem[]>;
  }

  private async assertUniqueMerchantCredentials(
    email: string | undefined | null,
    phone: string | undefined | null,
    excludeMerchantId?: string,
  ): Promise<void> {
    const orClause: Array<{ email: string } | { phone: string }> = [];
    if (email) {
      orClause.push({ email });
    }
    if (phone) {
      orClause.push({ phone });
    }
    if (orClause.length === 0) {
      return;
    }
    const conflict = await this.db.merchant.findFirst({
      where: {
        ...(excludeMerchantId ? { id: { not: excludeMerchantId } } : {}),
        OR: orClause,
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        'Another merchant already uses this email or phone',
      );
    }
  }

  async updateMerchant(
    merchantId: string,
    dto: UpdateMerchantDto,
  ): Promise<MerchantListItem> {
    const current = await this.db.merchant.findUnique({
      where: { id: merchantId },
      select: { email: true, phone: true },
    });

    const nextEmail = dto.email !== undefined ? dto.email : current?.email;
    const nextPhone = dto.phone !== undefined ? dto.phone : current?.phone;

    if (
      typeof dto.password === 'string' &&
      dto.password.length > 0 &&
      (!nextEmail || !nextPhone)
    ) {
      throw new BadRequestException(
        'Merchant must have both email and phone before a password can be set',
      );
    }

    if (dto.email !== undefined || dto.phone !== undefined) {
      await this.assertUniqueMerchantCredentials(
        dto.email !== undefined ? dto.email : undefined,
        dto.phone !== undefined ? dto.phone : undefined,
        merchantId,
      );
    }

    let passwordHash: string | undefined;
    const newPassword = dto.password;
    if (typeof newPassword === 'string' && newPassword.length > 0) {
      passwordHash = await hashPassword(newPassword);
    }

    return (await this.db.merchant.update({
      where: { id: merchantId },
      data: {
        name: dto.name,
        merchantType: dto.merchantType,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        merchantType: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as MerchantListItem;
  }

  async updateMerchantImage(
    merchantId: string,
    imageUrl: string,
  ): Promise<MerchantListItem> {
    return (await this.db.merchant.update({
      where: { id: merchantId },
      data: { imageUrl },
      select: {
        id: true,
        name: true,
        merchantType: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as MerchantListItem;
  }

  async setMerchantActive(
    merchantId: string,
    isActive: boolean,
  ): Promise<MerchantListItem> {
    return (await this.db.merchant.update({
      where: { id: merchantId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        merchantType: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as MerchantListItem;
  }

  async deleteMerchant(merchantId: string): Promise<{ message: string }> {
    await this.db.merchant.delete({
      where: { id: merchantId },
    });
    return { message: 'Merchant deleted successfully' };
  }

  async getMerchantProducts(merchantId: string): Promise<UnifiedProduct[]> {
    return this.catalog.getUnifiedProductsForMerchant(merchantId);
  }
}
